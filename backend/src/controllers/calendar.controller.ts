import { Response } from "express";
import { z } from "zod";
import {
  MeetingStatus,
  MeetingType,
  NotificationType,
  Prisma,
  TaskStatus,
  LeadStage,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import {
  assertRelatedInScope,
  canAssignTo,
  leadScope,
  meetingScope,
  taskScope,
} from "../services/scope.service.js";

const dateTime = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid date/time",
  });

const meetingFields = {
  title: z.string().trim().min(2, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  startTime: dateTime,
  endTime: dateTime,
  location: z.string().trim().max(300).optional(),
  type: z.nativeEnum(MeetingType).optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  hostId: z.string().min(1).nullable().optional(),
  customerId: z.string().min(1).nullable().optional(),
};

export const meetingSchema = z
  .object(meetingFields)
  .refine((d) => Date.parse(d.endTime) > Date.parse(d.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export const meetingUpdateSchema = z.object(meetingFields).partial();

const MEETING_INCLUDE = {
  host: { select: { id: true, name: true, email: true } },
  customer: { select: { id: true, name: true } },
} satisfies Prisma.MeetingInclude;

export async function getCalendarEvents(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { start, end } = req.query as Record<string, string | undefined>;

  const meetingAnd: Prisma.MeetingWhereInput[] = [await meetingScope(actor)];
  const taskAnd: Prisma.TaskWhereInput[] = [
    await taskScope(actor),
    { dueDate: { not: null } },
  ];
  const leadAnd: Prisma.LeadWhereInput[] = [
    await leadScope(actor),
    { followUpDate: { not: null } },
  ];

  if (
    start &&
    end &&
    !Number.isNaN(Date.parse(start)) &&
    !Number.isNaN(Date.parse(end))
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    meetingAnd.push({ startTime: { gte: startDate, lte: endDate } });
    taskAnd.push({ dueDate: { gte: startDate, lte: endDate } });
    leadAnd.push({ followUpDate: { gte: startDate, lte: endDate } });
  }

  const [meetings, tasks, leads] = await Promise.all([
    prisma.meeting.findMany({
      where: { AND: meetingAnd },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        customer: { select: { id: true, name: true, company: true } },
      },
    }),
    prisma.task.findMany({
      where: { AND: taskAnd },
      include: {
        assignedTo: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.findMany({
      where: { AND: leadAnd },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
  ]);

  const events = [
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      originalId: m.id,
      eventType: "MEETING",
      title: m.title,
      description: m.description,
      start: m.startTime,
      end: m.endTime,
      location: m.location,
      type: m.type,
      status: m.status,
      host: m.host,
      customer: m.customer,
      color: "#2563EB",
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      originalId: t.id,
      eventType: "TASK_DEADLINE",
      title: `Task Deadline: ${t.title}`,
      description: t.description,
      start: t.dueDate,
      end: t.dueDate,
      priority: t.priority,
      status: t.status,
      host: t.assignedTo,
      customer: t.customer,
      color:
        t.status !== TaskStatus.COMPLETED &&
        t.dueDate !== null &&
        t.dueDate < new Date()
          ? "#EF4444"
          : t.priority === "HIGH"
            ? "#EF4444"
            : "#F59E0B",
    })),
    ...leads
      .filter((l) => l.stage !== LeadStage.WON && l.stage !== LeadStage.LOST)
      .map((l) => ({
        id: `lead-${l.id}`,
        originalId: l.id,
        eventType: "FOLLOW_UP",
        title: `Follow-up: ${l.contactName} (${l.title})`,
        description: l.notes,
        start: l.followUpDate,
        end: l.followUpDate,
        priority: l.priority,
        host: l.assignedTo,
        color: "#06B6D4",
      })),
  ];

  res.json({ success: true, data: events });
}

export async function createMeeting(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const {
    hostId: requestedHost,
    customerId,
    startTime,
    endTime,
    ...rest
  } = req.body as z.infer<typeof meetingSchema>;

  const hostId = requestedHost || actor.userId;
  if (hostId !== actor.userId && !(await canAssignTo(actor, hostId))) {
    res.status(403).json({
      success: false,
      message: "You cannot schedule a meeting for that user.",
    });
    return;
  }
  const relatedError = await assertRelatedInScope(actor, { customerId });
  if (relatedError) {
    res.status(400).json({ success: false, message: relatedError });
    return;
  }

  const meeting = await prisma.meeting.create({
    data: {
      ...rest,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      customerId: customerId || null,
      organizationId: actor.organizationId,
      hostId,
    },
    include: MEETING_INCLUDE,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "MEETING_SCHEDULED",
    entityType: "Meeting",
    entityId: meeting.id,
    details: `Scheduled meeting "${meeting.title}" for ${meeting.startTime.toLocaleString()}`,
  });

  if (hostId !== actor.userId) {
    await createNotification({
      userId: hostId,
      title: "New meeting scheduled",
      message: `${actor.name} scheduled "${meeting.title}" for you on ${meeting.startTime.toLocaleString()}.`,
      type: NotificationType.MEETING,
      link: "/calendar",
    });
  }

  res.status(201).json({ success: true, data: meeting });
}

export async function updateMeeting(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const { hostId, customerId, startTime, endTime, ...rest } =
    req.body as z.infer<typeof meetingUpdateSchema>;

  const existing = await prisma.meeting.findFirst({
    where: { id, ...(await meetingScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Meeting not found" });
    return;
  }

  const newStart = startTime ? new Date(startTime) : existing.startTime;
  const newEnd = endTime ? new Date(endTime) : existing.endTime;
  if (newEnd <= newStart) {
    res
      .status(400)
      .json({ success: false, message: "End time must be after start time." });
    return;
  }

  const changingHost = hostId !== undefined && hostId !== existing.hostId;
  if (
    changingHost &&
    (hostId === null || !(await canAssignTo(actor, hostId)))
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot assign the meeting to that user.",
    });
    return;
  }
  if (customerId) {
    const relatedError = await assertRelatedInScope(actor, { customerId });
    if (relatedError) {
      res.status(400).json({ success: false, message: relatedError });
      return;
    }
  }

  const updated = await prisma.meeting.update({
    where: { id: existing.id },
    data: {
      ...rest,
      startTime: newStart,
      endTime: newEnd,
      ...(customerId !== undefined ? { customerId } : {}),
      ...(changingHost ? { hostId } : {}),
    },
    include: MEETING_INCLUDE,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "MEETING_UPDATED",
    entityType: "Meeting",
    entityId: updated.id,
    details: `Updated meeting "${updated.title}"`,
  });

  if (changingHost && hostId && hostId !== actor.userId) {
    await createNotification({
      userId: hostId,
      title: "Meeting assigned to you",
      message: `${actor.name} assigned you the meeting "${updated.title}".`,
      type: NotificationType.MEETING,
      link: "/calendar",
    });
  }

  res.json({ success: true, data: updated });
}

export async function deleteMeeting(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  const existing = await prisma.meeting.findFirst({
    where: { id, ...(await meetingScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Meeting not found" });
    return;
  }

  await prisma.meeting.delete({ where: { id: existing.id } });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "MEETING_DELETED",
    entityType: "Meeting",
    entityId: id,
    details: `Cancelled and deleted meeting "${existing.title}"`,
  });

  res.json({ success: true, message: "Meeting deleted successfully" });
}
