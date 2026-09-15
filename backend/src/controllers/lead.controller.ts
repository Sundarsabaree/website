import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';
import { LeadStage, Priority } from '@prisma/client';

export const leadSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  value: z.coerce.number().min(0).default(0),
  stage: z.nativeEnum(LeadStage).default(LeadStage.NEW),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  notes: z.string().optional(),
  followUpDate: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable()
});

export async function getLeads(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { stage, priority, assignedToId, search } = req.query as Record<string, string>;

  const where: any = {};

  if (req.user?.role === 'SALES_EXECUTIVE') {
    where.assignedToId = req.user.userId;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (stage) {
    where.stage = stage as LeadStage;
  }

  if (priority) {
    where.priority = priority as Priority;
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { contactName: { contains: s, mode: 'insensitive' } },
      { company: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } }
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, avatar: true }
      },
      customer: {
        select: { id: true, name: true, company: true }
      }
    }
  });

  res.json({ success: true, data: leads });
}

export async function createLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = req.body;
  const assignedToId = data.assignedToId || req.user?.userId;

  const lead = await prisma.lead.create({
    data: {
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      assignedToId
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'LEAD_CREATED',
    entityType: 'Lead',
    entityId: lead.id,
    details: `Created lead "${lead.title}" with value ₹${lead.value}`
  });

  res.status(201).json({ success: true, data: lead });
}

export async function updateLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body;

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      followUpDate: data.followUpDate !== undefined ? (data.followUpDate ? new Date(data.followUpDate) : null) : existing.followUpDate
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      customer: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'LEAD_UPDATED',
    entityType: 'Lead',
    entityId: updated.id,
    details: `Updated lead "${updated.title}"`
  });

  res.json({ success: true, data: updated });
}

export async function updateLeadStage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { stage } = req.body;

  if (!Object.values(LeadStage).includes(stage)) {
    res.status(400).json({ success: false, message: 'Invalid lead stage' });
    return;
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: { stage: stage as LeadStage },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'LEAD_STAGE_CHANGED',
    entityType: 'Lead',
    entityId: updated.id,
    details: `Moved lead "${updated.title}" from ${existing.stage} to ${stage}`
  });

  res.json({ success: true, data: updated });
}

export async function deleteLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return;
  }

  await prisma.lead.delete({ where: { id } });

  await logActivity({
    userId: req.user?.userId,
    action: 'LEAD_DELETED',
    entityType: 'Lead',
    entityId: id,
    details: `Deleted lead "${existing.title}"`
  });

  res.json({ success: true, message: 'Lead deleted successfully' });
}
