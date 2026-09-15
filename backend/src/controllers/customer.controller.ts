import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';
import { CustomerStatus } from '@prisma/client';

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  budget: z.coerce.number().min(0).default(0),
  interest: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional().default('India'),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.ACTIVE),
  assignedToId: z.string().nullable().optional(),
  notes: z.string().optional()
});

function calculateLeadScore(budget: number): string {
  if (budget > 70000) return 'Hot Lead 🔥';
  if (budget >= 30000) return 'Medium Lead 🟡';
  return 'Low Lead 🔵';
}

export async function getCustomers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const {
    search,
    status,
    industry,
    assignedToId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '20'
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10));
  const take = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * take;

  const where: any = {};

  // RBAC Filter: Sales Executive sees their own assigned customers or created by them (unless Admin/Manager)
  if (req.user?.role === 'SALES_EXECUTIVE') {
    where.OR = [
      { assignedToId: req.user.userId },
      { createdById: req.user.userId }
    ];
  }

  if (status) {
    where.status = status as CustomerStatus;
  }

  if (industry) {
    where.industry = industry;
  }

  if (assignedToId && (req.user?.role === 'ADMIN' || req.user?.role === 'MANAGER')) {
    where.assignedToId = assignedToId;
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { company: { contains: s, mode: 'insensitive' } },
      { interest: { contains: s, mode: 'insensitive' } },
      { city: { contains: s, mode: 'insensitive' } }
    ];
  }

  const allowedSortFields = ['name', 'budget', 'createdAt', 'company', 'status'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { deals: true, tasks: true, meetings: true, leads: true }
        }
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      items: customers,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    }
  });
}

export async function getCustomerById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, avatar: true, phone: true }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      leads: {
        orderBy: { createdAt: 'desc' }
      },
      deals: {
        orderBy: { createdAt: 'desc' }
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, name: true } }
        }
      },
      meetings: {
        orderBy: { startTime: 'asc' },
        include: {
          host: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!customer) {
    res.status(404).json({ success: false, message: 'Customer not found' });
    return;
  }

  res.json({ success: true, data: customer });
}

export async function createCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = req.body;
  const leadScore = calculateLeadScore(data.budget);

  // Check unique email
  const existing = await prisma.customer.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) {
    res.status(400).json({ success: false, message: 'A customer with this email already exists.' });
    return;
  }

  const assignedToId = data.assignedToId || req.user?.userId;

  const customer = await prisma.customer.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
      leadScore,
      assignedToId,
      createdById: req.user?.userId
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'CUSTOMER_CREATED',
    entityType: 'Customer',
    entityId: customer.id,
    details: `Added new customer ${customer.name} (Budget: ₹${customer.budget}, ${leadScore})`
  });

  res.status(201).json({ success: true, data: customer });
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body;

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Customer not found' });
    return;
  }

  // If email is being changed, ensure it's not duplicate
  if (data.email && data.email.toLowerCase().trim() !== existing.email) {
    const duplicate = await prisma.customer.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });
    if (duplicate) {
      res.status(400).json({ success: false, message: 'Another customer with this email already exists.' });
      return;
    }
  }

  const leadScore = data.budget !== undefined ? calculateLeadScore(data.budget) : existing.leadScore;

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : existing.email,
      leadScore
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } }
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'CUSTOMER_UPDATED',
    entityType: 'Customer',
    entityId: updated.id,
    details: `Updated details for customer ${updated.name}`
  });

  res.json({ success: true, data: updated });
}

export async function deleteCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Customer not found' });
    return;
  }

  await prisma.customer.delete({ where: { id } });

  await logActivity({
    userId: req.user?.userId,
    action: 'CUSTOMER_DELETED',
    entityType: 'Customer',
    entityId: id,
    details: `Deleted customer ${existing.name}`
  });

  res.json({ success: true, message: 'Customer deleted successfully' });
}

export async function importCustomersCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { rows } = req.body; // Array of objects
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: 'Invalid or empty CSV data.' });
    return;
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    if (!row.name || !row.email) {
      skippedCount++;
      continue;
    }

    const email = String(row.email).toLowerCase().trim();
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) {
      skippedCount++;
      continue;
    }

    const budget = Number(row.budget) || 0;
    const leadScore = calculateLeadScore(budget);

    await prisma.customer.create({
      data: {
        name: String(row.name).trim(),
        email,
        phone: row.phone ? String(row.phone).trim() : null,
        company: row.company ? String(row.company).trim() : null,
        industry: row.industry ? String(row.industry).trim() : 'General',
        budget,
        interest: row.interest ? String(row.interest).trim() : null,
        leadScore,
        address: row.address ? String(row.address).trim() : null,
        city: row.city ? String(row.city).trim() : null,
        state: row.state ? String(row.state).trim() : null,
        country: row.country ? String(row.country).trim() : 'India',
        status: (row.status?.toUpperCase() as CustomerStatus) || CustomerStatus.ACTIVE,
        assignedToId: req.user?.userId,
        createdById: req.user?.userId
      }
    });
    createdCount++;
  }

  await logActivity({
    userId: req.user?.userId,
    action: 'CSV_IMPORT',
    entityType: 'Customer',
    details: `Imported ${createdCount} customers from CSV (${skippedCount} duplicates/invalid skipped)`
  });

  res.json({
    success: true,
    message: `Successfully imported ${createdCount} customers. ${skippedCount} skipped.`,
    createdCount,
    skippedCount
  });
}
