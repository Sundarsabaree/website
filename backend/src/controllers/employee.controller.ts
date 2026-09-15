import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';
import { Role } from '@prisma/client';

export const employeeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.nativeEnum(Role).default(Role.SALES_EXECUTIVE),
  phone: z.string().optional(),
  department: z.string().optional().default('Sales'),
  status: z.string().optional().default('ACTIVE'),
  avatar: z.string().optional()
});

export async function getEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { search, role, department } = req.query as Record<string, string>;

  const where: any = {};

  if (role) {
    where.role = role as Role;
  }

  if (department) {
    where.department = department;
  }

  if (search) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { department: { contains: s, mode: 'insensitive' } }
    ];
  }

  const employees = await prisma.user.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      department: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          assignedCustomers: true,
          assignedLeads: true,
          assignedDeals: true,
          assignedTasks: true
        }
      }
    }
  });

  res.json({ success: true, data: employees });
}

export async function getEmployeePerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employees = await prisma.user.findMany({
    where: { role: { in: [Role.SALES_EXECUTIVE, Role.MANAGER] } },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      department: true,
      assignedDeals: {
        select: { value: true, stage: true }
      },
      assignedLeads: {
        select: { id: true, stage: true }
      },
      assignedTasks: {
        select: { id: true, status: true }
      },
      assignedCustomers: {
        select: { id: true, budget: true }
      }
    }
  });

  const performanceList = employees.map((emp) => {
    const wonDeals = emp.assignedDeals.filter((d) => d.stage === 'CLOSED_WON');
    const totalWonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const totalPipeline = emp.assignedDeals.reduce((sum, d) => sum + d.value, 0);
    const totalTasks = emp.assignedTasks.length;
    const completedTasks = emp.assignedTasks.filter((t) => t.status === 'COMPLETED').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      avatar: emp.avatar,
      role: emp.role,
      department: emp.department,
      totalWonRevenue,
      totalPipeline,
      dealsWonCount: wonDeals.length,
      activeLeadsCount: emp.assignedLeads.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST').length,
      customerCount: emp.assignedCustomers.length,
      taskCompletionRate
    };
  });

  res.json({ success: true, data: performanceList });
}

export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = req.body;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) {
    res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    return;
  }

  const defaultPassword = data.password || 'Welcome@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const employee = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role || Role.SALES_EXECUTIVE,
      phone: data.phone,
      department: data.department || 'Sales',
      avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name.replace(/\s+/g, '')}`,
      status: data.status || 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      department: true,
      status: true,
      createdAt: true
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'EMPLOYEE_ADDED',
    entityType: 'User',
    entityId: employee.id,
    details: `Added new employee ${employee.name} (${employee.role}, ${employee.department})`
  });

  res.status(201).json({ success: true, data: employee });
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;
  const data = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }

  const updateData: any = {
    name: data.name,
    role: data.role,
    phone: data.phone,
    department: data.department,
    status: data.status,
    avatar: data.avatar
  };

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      phone: true,
      department: true,
      status: true,
      createdAt: true
    }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'User',
    entityId: updated.id,
    details: `Updated details for ${updated.name} (Role: ${updated.role})`
  });

  res.json({ success: true, data: updated });
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  if (req.user?.userId === id) {
    res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }

  await prisma.user.delete({ where: { id } });

  await logActivity({
    userId: req.user?.userId,
    action: 'EMPLOYEE_DELETED',
    entityType: 'User',
    entityId: id,
    details: `Deleted employee ${existing.name}`
  });

  res.json({ success: true, message: 'Employee deleted successfully' });
}
