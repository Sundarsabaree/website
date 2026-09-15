import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';
import { MeetingStatus, MeetingType } from '@prisma/client';

export const meetingSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().optional(),
  type: z.nativeEnum(MeetingType).default(MeetingType.ONLINE),
  status: z.nativeEnum(MeetingStatus).default(MeetingStatus.SCHEDULED),
  hostId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable()
});

export async function getCalendarEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { start, end } = req.query as Record<string, string>;

  const meetingWhere: any = {};
  const taskWhere: any = { dueDate: { not: null } };
  const leadWhere: any = { followUpDate: { not: null } };

  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    meetingWhere.startTime = { gte: startDate, lte: endDate };
    taskWhere.dueDate = { gte: startDate, lte: endDate };
    leadWhere.followUpDate = { gte: startDate, lte: endDate };
  }

  if (req.user?.role === 'SALES_EXECUTIVE') {
    meetingWhere.OR = [{ hostId: req.user.userId }];
    taskWhere.assignedToId = req.user.userId;
    leadWhere.assignedToId = req.user.userId;
  }

  const [meetings, tasks, leads] = await Promise.all([
    prisma.meeting.findMany({
      where: meetingWhere,
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        customer: { select: { id: true, name: true, company: true } }
      }
    }),
    prisma.task.findMany({
      where: taskWhere,
      include: {
        assignedTo: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } }
      }
    }),
    prisma.lead.findMany({
      where: leadWhere,
      include: {
        assignedTo: { select: { id: true, name: true } }
      }
    })
  ]);

  // Aggregate into unified Calendar Event array
  const events = [
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      originalId: m.id,
      eventType: 'MEETING',
      title: m.title,
      description: m.description,
      start: m.startTime,
      end: m.endTime,
      location: m.location,
      type: m.type,
      status: m.status,
      host: m.host,
      customer: m.customer,
      color: '#2563EB' // Primary blue
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      originalId: t.id,
      eventType: 'TASK_DEADLINE',
      title: `Task Deadline: ${t.title}`,
      description: t.description,
      start: t.dueDate,
      end: t.dueDate,
      priority: t.priority,
      status: t.status,
      host: t.assignedTo,
      customer: t.customer,
      color: t.priority === 'HIGH' ? '#EF4444' : '#F59E0B'
    })),
    ...leads.map((l) => ({
      id: `lead-${l.id}`,
      originalId: l.id,
      eventType: 'FOLLOW_UP',
      title: `Follow-up: ${l.contactName} (${l.title})`,
      description: l.notes,
      start: l.followUpDate,
      end: l.followUpDate,
      priority: l.priority,
      host: l.assignedTo,
      color: '#06B6D4' // Accent cyan
    }))
  ];

  res.json({ success: true, data: events });
}

export async function createMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = req.body;
  const hostId = data.hostId || req.user?.userId;

  const meeting = await prisma.meeting.create({
    data: {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      hostId
    },
    include: {
      host: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'MEETING_SCHEDULED',
    entityType: 'Meeting',
    entityId: meeting.id,
    details: `Scheduled meeting "${meeting.title}" for ${new Date(meeting.startTime).toLocaleString()}`
  });

  res.status(201).json({ success: true, data: meeting });
}

export async function updateMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body;

  const existing = await prisma.meeting.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Meeting not found' });
    return;
  }

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : existing.startTime,
      endTime: data.endTime ? new Date(data.endTime) : existing.endTime
    },
    include: {
      host: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'MEETING_UPDATED',
    entityType: 'Meeting',
    entityId: updated.id,
    details: `Updated meeting "${updated.title}"`
  });

  res.json({ success: true, data: updated });
}

export async function deleteMeeting(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  const existing = await prisma.meeting.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Meeting not found' });
    return;
  }

  await prisma.meeting.delete({ where: { id } });

  await logActivity({
    userId: req.user?.userId,
    action: 'MEETING_DELETED',
    entityType: 'Meeting',
    entityId: id,
    details: `Cancelled and deleted meeting "${existing.title}"`
  });

  res.json({ success: true, message: 'Meeting deleted successfully' });
}
