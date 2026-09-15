import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  department: z.string().optional(),
  avatar: z.string().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.userId },
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

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const activities = await prisma.activity.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  res.json({
    success: true,
    data: {
      ...user,
      activities
    }
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, phone, department, avatar } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user?.userId },
    data: {
      name,
      phone,
      department,
      avatar
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
    action: 'PROFILE_UPDATED',
    entityType: 'User',
    entityId: updated.id,
    details: `${updated.name} updated their profile information`
  });

  res.json({ success: true, data: updated });
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user?.userId }
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    res.status(400).json({ success: false, message: 'Current password does not match.' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  await logActivity({
    userId: req.user?.userId,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: user.id,
    details: `${user.name} changed their security password`
  });

  res.json({ success: true, message: 'Password updated successfully.' });
}
