import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';
import { DealStage } from '@prisma/client';

export const dealSchema = z.object({
  title: z.string().min(2, 'Deal title is required'),
  value: z.coerce.number().min(0, 'Value must be non-negative'),
  stage: z.nativeEnum(DealStage).default(DealStage.DISCOVERY),
  probability: z.coerce.number().min(0).max(100).default(20),
  closingDate: z.string().optional().nullable(),
  customerId: z.string().min(1, 'Associated customer is required'),
  assignedToId: z.string().optional().nullable()
});

export async function getDeals(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { stage, assignedToId, customerId } = req.query as Record<string, string>;

  const where: any = {};

  if (req.user?.role === 'SALES_EXECUTIVE') {
    where.assignedToId = req.user.userId;
  } else if (assignedToId) {
    where.assignedToId = assignedToId;
  }

  if (stage) {
    where.stage = stage as DealStage;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, company: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatar: true } }
    }
  });

  // Calculate Pipeline Metrics
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const closedWon = deals.filter(d => d.stage === DealStage.CLOSED_WON);
  const closedLost = deals.filter(d => d.stage === DealStage.CLOSED_LOST);
  const closedTotal = closedWon.length + closedLost.length;
  const winRate = closedTotal > 0 ? Math.round((closedWon.length / closedTotal) * 100) : 0;
  const forecastValue = deals
    .filter(d => d.stage !== DealStage.CLOSED_LOST)
    .reduce((sum, d) => sum + (d.value * (d.probability / 100)), 0);

  res.json({
    success: true,
    data: {
      items: deals,
      metrics: {
        totalDeals: deals.length,
        totalPipelineValue: totalValue,
        forecastRevenue: Math.round(forecastValue),
        winRate,
        closedWonCount: closedWon.length,
        closedWonValue: closedWon.reduce((sum, d) => sum + d.value, 0)
      }
    }
  });
}

export async function createDeal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = req.body;
  const assignedToId = data.assignedToId || req.user?.userId;

  const deal = await prisma.deal.create({
    data: {
      ...data,
      closingDate: data.closingDate ? new Date(data.closingDate) : null,
      assignedToId
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'DEAL_CREATED',
    entityType: 'Deal',
    entityId: deal.id,
    details: `Created deal "${deal.title}" valued at ₹${deal.value} with ${deal.customer?.name}`
  });

  res.status(201).json({ success: true, data: deal });
}

export async function updateDeal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body;

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Deal not found' });
    return;
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: {
      ...data,
      closingDate: data.closingDate !== undefined ? (data.closingDate ? new Date(data.closingDate) : null) : existing.closingDate
    },
    include: {
      customer: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: updated.stage === 'CLOSED_WON' ? 'DEAL_CLOSED_WON' : 'DEAL_UPDATED',
    entityType: 'Deal',
    entityId: updated.id,
    details: `Updated deal "${updated.title}" (Stage: ${updated.stage}, Value: ₹${updated.value})`
  });

  res.json({ success: true, data: updated });
}

export async function deleteDeal(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Deal not found' });
    return;
  }

  await prisma.deal.delete({ where: { id } });

  await logActivity({
    userId: req.user?.userId,
    action: 'DEAL_DELETED',
    entityType: 'Deal',
    entityId: id,
    details: `Deleted deal "${existing.title}"`
  });

  res.json({ success: true, message: 'Deal deleted successfully' });
}
