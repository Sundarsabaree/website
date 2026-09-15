import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';
import { Priority, TaskStatus } from '@prisma/client';

export const taskSchema = z.object({
  title: z.string().min(2, 'Task title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.PENDING),
  assignedToId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable()
});

export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { status, priority, assignedToId } = req.query as Record<string, string>;

  const where: any = {};

  if (req.user?.role === 'SALES_EXECUTIVE') {
    where.assignedToId = req.user.userId;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (status) {
    where.status = status as TaskStatus;
  }

  if (priority) {
    where.priority = priority as Priority;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' }
    ],
    include: {
      assignedTo: { select: { id: true, name: true, email: true, avatar: true } },
      createdBy: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, company: true } }
    }
  });

  res.json({ success: true, data: tasks });
}

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = req.body;
  const assignedToId = data.assignedToId || req.user?.userId;

  const task = await prisma.task.create({
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assignedToId,
      createdById: req.user?.userId
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'TASK_CREATED',
    entityType: 'Task',
    entityId: task.id,
    details: `Created task "${task.title}" (Priority: ${task.priority})`
  });

  res.status(201).json({ success: true, data: task });
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : existing.dueDate
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: updated.status === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_UPDATED',
    entityType: 'Task',
    entityId: updated.id,
    details: `Updated task "${updated.title}" - Status: ${updated.status}`
  });

  res.json({ success: true, data: updated });
}

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Task not found' });
    return;
  }

  await prisma.task.delete({ where: { id } });

  await logActivity({
    userId: req.user?.userId,
    action: 'TASK_DELETED',
    entityType: 'Task',
    entityId: id,
    details: `Deleted task "${existing.title}"`
  });

  res.json({ success: true, message: 'Task deleted successfully' });
}
