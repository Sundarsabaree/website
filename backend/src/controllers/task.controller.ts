import { Response } from "express";
import { z } from "zod";
import {
  NotificationType,
  Prisma,
  Priority,
  Role,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import {
  assertRelatedInScope,
  canAssignTo,
  taskScope,
} from "../services/scope.service.js";
import { optionalDate, parseDate } from "../utils/validation.js";

/**
 * Tasks:
 *   ADMIN = organisation | MANAGER = own + team's tasks, can assign to team | SALES_EXECUTIVE = own tasks, self-assign only.
 * Statuses in DB: PENDING ("To Do"), IN_PROGRESS, COMPLETED. OVERDUE is COMPUTED (due date passed and not completed);
 * `?status=OVERDUE` is supported as a filter and every task carries `isOverdue`.
 */

const taskFields = {
  title: z.string().trim().min(2, "Task title is required").max(200),
  description: z.string().max(5000).optional(),
  dueDate: optionalDate,
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
  customerId: z.string().min(1).nullable().optional(),
  leadId: z.string().min(1).nullable().optional(),
  dealId: z.string().min(1).nullable().optional(),
};

export const taskSchema = z.object(taskFields);
export const taskUpdateSchema = z.object(taskFields).partial();

const TASK_INCLUDE = {
  assignedTo: { select: { id: true, name: true, email: true, avatar: true } },
  createdBy: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, company: true } },
  lead: { select: { id: true, title: true } },
  deal: { select: { id: true, title: true } },
} satisfies Prisma.TaskInclude;

function withOverdue<T extends { status: TaskStatus; dueDate: Date | null }>(
  task: T,
): T & { isOverdue: boolean } {
  return {
    ...task,
    isOverdue:
      task.status !== TaskStatus.COMPLETED &&
      task.dueDate !== null &&
      task.dueDate < new Date(),
  };
}

export async function getTasks(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { status, priority, assignedToId, customerId, leadId, dealId, search } =
    req.query as Record<string, string | undefined>;

  const and: Prisma.TaskWhereInput[] = [await taskScope(actor)];
  if (status === "OVERDUE") {
    and.push({
      status: { not: TaskStatus.COMPLETED },
      dueDate: { lt: new Date() },
    });
  } else if (
    status &&
    (Object.values(TaskStatus) as string[]).includes(status)
  ) {
    and.push({ status: status as TaskStatus });
  }
  if (priority && (Object.values(Priority) as string[]).includes(priority))
    and.push({ priority: priority as Priority });
  if (assignedToId) and.push({ assignedToId });
  if (customerId) and.push({ customerId });
  if (leadId) and.push({ leadId });
  if (dealId) and.push({ dealId });
  if (search?.trim()) {
    const s = search.trim();
    and.push({
      OR: [
        { title: { contains: s, mode: "insensitive" } },
        { assignedTo: { is: { name: { contains: s, mode: "insensitive" } } } },
      ],
    });
  }

  const tasks = await prisma.task.findMany({
    where: { AND: and },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 500,
    include: TASK_INCLUDE,
  });

  res.json({ success: true, data: tasks.map(withOverdue) });
}

export async function createTask(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const {
    assignedToId: requestedAssignee,
    dueDate,
    customerId,
    leadId,
    dealId,
    ...rest
  } = req.body as z.infer<typeof taskSchema>;

  // Sales Executives can only create tasks for themselves (canAssignTo enforces this).
  const assignedToId = requestedAssignee || actor.userId;
  if (
    assignedToId !== actor.userId &&
    !(await canAssignTo(actor, assignedToId))
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot assign a task to that user.",
    });
    return;
  }
  const relatedError = await assertRelatedInScope(actor, {
    customerId,
    leadId,
    dealId,
  });
  if (relatedError) {
    res.status(400).json({ success: false, message: relatedError });
    return;
  }

  const task = await prisma.task.create({
    data: {
      ...rest,
      dueDate: parseDate(dueDate) ?? null,
      customerId: customerId || null,
      leadId: leadId || null,
      dealId: dealId || null,
      organizationId: actor.organizationId,
      assignedToId,
      createdById: actor.userId,
    },
    include: TASK_INCLUDE,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task.id,
    details: `Created task "${task.title}" (Priority: ${task.priority})${assignedToId !== actor.userId ? ` for ${task.assignedTo?.name}` : ""}`,
  });

  if (assignedToId !== actor.userId) {
    await createNotification({
      userId: assignedToId,
      title: "New task assigned",
      message: `${actor.name} assigned you the task "${task.title}".`,
      type: NotificationType.TASK,
      link: "/tasks",
    });
  }

  res.status(201).json({ success: true, data: withOverdue(task) });
}

export async function updateTask(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const { assignedToId, dueDate, customerId, leadId, dealId, ...rest } =
    req.body as z.infer<typeof taskUpdateSchema>;

  const existing = await prisma.task.findFirst({
    where: { id, ...(await taskScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Task not found" });
    return;
  }

  const reassigning =
    assignedToId !== undefined && assignedToId !== existing.assignedToId;
  if (reassigning) {
    if (assignedToId === null) {
      if (actor.role === Role.SALES_EXECUTIVE) {
        res
          .status(403)
          .json({ success: false, message: "You cannot unassign a task." });
        return;
      }
    } else if (!(await canAssignTo(actor, assignedToId))) {
      res.status(403).json({
        success: false,
        message: "You cannot assign a task to that user.",
      });
      return;
    }
  }
  const relatedError = await assertRelatedInScope(actor, {
    customerId,
    leadId,
    dealId,
  });
  if (relatedError) {
    res.status(400).json({ success: false, message: relatedError });
    return;
  }

  const updated = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: parseDate(dueDate) } : {}),
      ...(customerId !== undefined ? { customerId } : {}),
      ...(leadId !== undefined ? { leadId } : {}),
      ...(dealId !== undefined ? { dealId } : {}),
      ...(reassigning ? { assignedToId } : {}),
    },
    include: TASK_INCLUDE,
  });

  const justCompleted =
    existing.status !== TaskStatus.COMPLETED &&
    updated.status === TaskStatus.COMPLETED;
  const statusChanged = existing.status !== updated.status;
  const relatedRecord =
    updated.customer?.name || updated.lead?.title || updated.deal?.title;
  const relatedDetails = relatedRecord ? ` · Related: ${relatedRecord}` : "";

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: reassigning
      ? existing.assignedToId
        ? "TASK_REASSIGNED"
        : "TASK_ASSIGNED"
      : justCompleted
        ? "TASK_COMPLETED"
        : "TASK_UPDATED",
    entityType: "Task",
    entityId: updated.id,
    details: reassigning
      ? `Task "${updated.title}" ${existing.assignedToId ? "reassigned" : "assigned"} to ${updated.assignedTo?.name ?? "nobody"}`
      : justCompleted
        ? `Completed task "${updated.title}" (Status: ${existing.status} -> ${updated.status})${relatedDetails}`
        : statusChanged
          ? `Updated task "${updated.title}" (Status: ${existing.status} -> ${updated.status})${relatedDetails}`
          : `Updated task "${updated.title}"${relatedDetails}`,
  });

  if (reassigning && assignedToId && assignedToId !== actor.userId) {
    await createNotification({
      userId: assignedToId,
      title: existing.assignedToId
        ? "Task reassigned to you"
        : "New task assigned",
      message: `${actor.name} assigned you the task "${updated.title}".`,
      type: NotificationType.TASK,
      link: "/tasks",
    });
  }
  // Tell whoever created the task when someone else completes it.
  if (
    justCompleted &&
    updated.createdById &&
    updated.createdById !== actor.userId
  ) {
    await createNotification({
      userId: updated.createdById,
      title: "Task completed",
      message: `${actor.name} completed "${updated.title}".`,
      type: NotificationType.TASK,
      link: "/tasks",
    });
  }

  res.json({ success: true, data: withOverdue(updated) });
}

export async function deleteTask(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  const existing = await prisma.task.findFirst({
    where: { id, ...(await taskScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Task not found" });
    return;
  }
  // A Sales Executive may only delete tasks they created themselves (not ones assigned by a manager).
  if (
    actor.role === Role.SALES_EXECUTIVE &&
    existing.createdById !== actor.userId
  ) {
    res.status(403).json({
      success: false,
      message: "You can only delete tasks you created.",
    });
    return;
  }

  await prisma.task.delete({ where: { id: existing.id } });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "TASK_DELETED",
    entityType: "Task",
    entityId: id,
    details: `Deleted task "${existing.title}"`,
  });

  res.json({ success: true, message: "Task deleted successfully" });
}
