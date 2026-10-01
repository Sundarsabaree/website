import { Response } from "express";
import { z } from "zod";
import { DealStage, NotificationType, Prisma, Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import {
  assertRelatedInScope,
  canAssignTo,
  dealScope,
  taskScope,
} from "../services/scope.service.js";
import { optionalDate, parseDate } from "../utils/validation.js";
import { DEAL_STAGE_LABEL, OPEN_DEAL_STAGES } from "../utils/labels.js";

/**
 * Deal access: ADMIN = organisation, MANAGER = own + team's deals, SALES_EXECUTIVE = assigned deals.
 * Expected revenue = value x probability, over OPEN deals only.
 */

const dealFields = {
  title: z.string().trim().min(2, "Deal title is required").max(200),
  value: z.coerce.number().min(0, "Value must be non-negative"),
  stage: z.nativeEnum(DealStage).optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  closingDate: optionalDate,
  nextStep: z.string().trim().max(300).optional(),
  description: z.string().max(5000).optional(),
  customerId: z.string().min(1, "Associated customer is required"),
  assignedToId: z.string().min(1).nullable().optional(),
};

export const dealSchema = z.object(dealFields);
export const dealUpdateSchema = z.object(dealFields).partial();

const DEAL_INCLUDE = {
  customer: { select: { id: true, name: true, company: true, email: true } },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      managerId: true,
    },
  },
} satisfies Prisma.DealInclude;

function isOpen(stage: DealStage): boolean {
  return OPEN_DEAL_STAGES.includes(stage);
}

export async function getDeals(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { stage, assignedToId, customerId, search } = req.query as Record<
    string,
    string | undefined
  >;

  const and: Prisma.DealWhereInput[] = [await dealScope(actor)];
  if (stage && (Object.values(DealStage) as string[]).includes(stage))
    and.push({ stage: stage as DealStage });
  if (assignedToId) and.push({ assignedToId });
  if (customerId) and.push({ customerId });
  if (search?.trim()) {
    const s = search.trim();
    const stageGuess = s.toUpperCase().replace(/\s+/g, "_");
    const or: Prisma.DealWhereInput[] = [
      { title: { contains: s, mode: "insensitive" } },
      {
        customer: {
          is: {
            OR: [
              { name: { contains: s, mode: "insensitive" } },
              { company: { contains: s, mode: "insensitive" } },
            ],
          },
        },
      },
      { assignedTo: { is: { name: { contains: s, mode: "insensitive" } } } },
    ];
    if ((Object.values(DealStage) as string[]).includes(stageGuess))
      or.push({ stage: stageGuess as DealStage });
    and.push({ OR: or });
  }

  const deals = await prisma.deal.findMany({
    where: { AND: and },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: DEAL_INCLUDE,
  });

  const open = deals.filter((d) => isOpen(d.stage));
  const closedWon = deals.filter((d) => d.stage === DealStage.CLOSED_WON);
  const closedLost = deals.filter((d) => d.stage === DealStage.CLOSED_LOST);
  const closedTotal = closedWon.length + closedLost.length;

  res.json({
    success: true,
    data: {
      items: deals,
      metrics: {
        totalDeals: deals.length,
        openDeals: open.length,
        totalPipelineValue: open.reduce((sum, d) => sum + d.value, 0),
        forecastRevenue: Math.round(
          open.reduce((sum, d) => sum + d.value * (d.probability / 100), 0),
        ),
        winRate:
          closedTotal > 0
            ? Math.round((closedWon.length / closedTotal) * 100)
            : 0,
        closedWonCount: closedWon.length,
        closedWonValue: closedWon.reduce((sum, d) => sum + d.value, 0),
      },
    },
  });
}

/** Deal detail + related tasks + activity timeline (deal events and its tasks' events). */
export async function getDealById(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  const deal = await prisma.deal.findFirst({
    where: { id, ...(await dealScope(actor)) },
    include: DEAL_INCLUDE,
  });
  if (!deal) {
    res.status(404).json({ success: false, message: "Deal not found" });
    return;
  }

  const tasks = await prisma.task.findMany({
    where: { AND: [await taskScope(actor), { dealId: deal.id }] },
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  const timeline = await prisma.activity.findMany({
    where: {
      organizationId: actor.organizationId,
      OR: [
        { entityType: "Deal", entityId: deal.id },
        ...(tasks.length
          ? [{ entityType: "Task", entityId: { in: tasks.map((t) => t.id) } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { id: true, name: true } } },
  });

  res.json({ success: true, data: { ...deal, tasks, timeline } });
}

export async function createDeal(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const {
    assignedToId: requestedAssignee,
    closingDate,
    customerId,
    ...rest
  } = req.body as z.infer<typeof dealSchema>;

  const assignedToId = requestedAssignee || actor.userId;
  if (
    assignedToId !== actor.userId &&
    !(await canAssignTo(actor, assignedToId))
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot assign a deal to that user.",
    });
    return;
  }
  const relatedError = await assertRelatedInScope(actor, { customerId });
  if (relatedError) {
    res.status(400).json({ success: false, message: relatedError });
    return;
  }

  const deal = await prisma.deal.create({
    data: {
      ...rest,
      closingDate: parseDate(closingDate) ?? null,
      customerId,
      organizationId: actor.organizationId,
      assignedToId,
    },
    include: DEAL_INCLUDE,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "DEAL_CREATED",
    entityType: "Deal",
    entityId: deal.id,
    details: `Created deal "${deal.title}" valued at ₹${deal.value} with ${deal.customer?.name ?? "customer"}`,
  });

  if (assignedToId !== actor.userId) {
    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action: "DEAL_ASSIGNED",
      entityType: "Deal",
      entityId: deal.id,
      details: `Deal "${deal.title}" assigned to ${deal.assignedTo?.name}`,
    });
    await createNotification({
      userId: assignedToId,
      title: "New deal assigned",
      message: `${actor.name} assigned you the deal "${deal.title}".`,
      type: NotificationType.DEAL,
      link: "/sales",
    });
  }

  res.status(201).json({ success: true, data: deal });
}

export async function updateDeal(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const { assignedToId, closingDate, customerId, ...rest } =
    req.body as z.infer<typeof dealUpdateSchema>;

  const existing = await prisma.deal.findFirst({
    where: { id, ...(await dealScope(actor)) },
    include: DEAL_INCLUDE,
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Deal not found" });
    return;
  }

  const reassigning =
    assignedToId !== undefined && assignedToId !== existing.assignedToId;
  if (reassigning) {
    if (assignedToId === null) {
      if (actor.role === Role.SALES_EXECUTIVE) {
        res
          .status(403)
          .json({ success: false, message: "You cannot unassign a deal." });
        return;
      }
    } else if (!(await canAssignTo(actor, assignedToId))) {
      res.status(403).json({
        success: false,
        message: "You cannot assign a deal to that user.",
      });
      return;
    }
  }
  if (customerId) {
    const relatedError = await assertRelatedInScope(actor, { customerId });
    if (relatedError) {
      res.status(400).json({ success: false, message: relatedError });
      return;
    }
  }

  const updated = await prisma.deal.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(closingDate !== undefined
        ? { closingDate: parseDate(closingDate) }
        : {}),
      ...(customerId !== undefined ? { customerId } : {}),
      ...(reassigning ? { assignedToId } : {}),
    },
    include: DEAL_INCLUDE,
  });

  const stageChanged =
    rest.stage !== undefined && rest.stage !== existing.stage;

  if (stageChanged) {
    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action:
        updated.stage === DealStage.CLOSED_WON
          ? "DEAL_CLOSED_WON"
          : updated.stage === DealStage.CLOSED_LOST
            ? "DEAL_CLOSED_LOST"
            : "DEAL_STAGE_CHANGED",
      entityType: "Deal",
      entityId: updated.id,
      details: `Stage changed from ${DEAL_STAGE_LABEL[existing.stage]} to ${DEAL_STAGE_LABEL[updated.stage]} on "${updated.title}"`,
    });

    // Tell the owner and the owner's manager (never the person who made the change).
    const recipients = new Set<string>();
    if (updated.assignedTo?.id) recipients.add(updated.assignedTo.id);
    if (updated.assignedTo?.managerId)
      recipients.add(updated.assignedTo.managerId);
    recipients.delete(actor.userId);
    await Promise.all(
      [...recipients].map((userId) =>
        createNotification({
          userId,
          title: "Deal stage changed",
          message: `${actor.name} moved "${updated.title}" to ${DEAL_STAGE_LABEL[updated.stage]}.`,
          type: NotificationType.DEAL,
          link: "/sales",
        }),
      ),
    );
  }

  if (reassigning) {
    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action: existing.assignedToId ? "DEAL_REASSIGNED" : "DEAL_ASSIGNED",
      entityType: "Deal",
      entityId: updated.id,
      details: `Deal "${updated.title}" ${existing.assignedToId ? "reassigned" : "assigned"} to ${updated.assignedTo?.name ?? "nobody"}`,
    });
    const notify: Array<{ userId: string; title: string; message: string }> =
      [];
    if (assignedToId && assignedToId !== actor.userId) {
      notify.push({
        userId: assignedToId,
        title: existing.assignedToId
          ? "Deal reassigned to you"
          : "New deal assigned",
        message: `${actor.name} assigned you the deal "${updated.title}".`,
      });
    }
    if (existing.assignedToId && existing.assignedToId !== actor.userId) {
      notify.push({
        userId: existing.assignedToId,
        title: "Deal reassigned",
        message: `"${updated.title}" was reassigned to ${updated.assignedTo?.name ?? "someone else"}.`,
      });
    }
    await Promise.all(
      notify.map((n) =>
        createNotification({
          ...n,
          type: NotificationType.DEAL,
          link: "/sales",
        }),
      ),
    );
  }

  if (!stageChanged && !reassigning) {
    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action: "DEAL_UPDATED",
      entityType: "Deal",
      entityId: updated.id,
      details: `Updated deal "${updated.title}" (Stage: ${DEAL_STAGE_LABEL[updated.stage]}, Value: ₹${updated.value})`,
    });
  }

  res.json({ success: true, data: updated });
}

export async function deleteDeal(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  const existing = await prisma.deal.findFirst({
    where: { id, ...(await dealScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Deal not found" });
    return;
  }

  await prisma.deal.delete({ where: { id: existing.id } });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "DEAL_DELETED",
    entityType: "Deal",
    entityId: id,
    details: `Deleted deal "${existing.title}"`,
  });

  res.json({ success: true, message: "Deal deleted successfully" });
}
