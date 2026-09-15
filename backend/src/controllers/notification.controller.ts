import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: 'desc' },
    take: 30
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.userId, isRead: false }
  });

  res.json({
    success: true,
    data: {
      items: notifications,
      unreadCount
    }
  });
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  await prisma.notification.updateMany({
    where: { id, userId: req.user?.userId },
    data: { isRead: true }
  });

  res.json({ success: true, message: 'Notification marked as read' });
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId: req.user?.userId },
    data: { isRead: true }
  });

  res.json({ success: true, message: 'All notifications marked as read' });
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  const id = req.params.id as string;

  await prisma.notification.deleteMany({
    where: { id, userId: req.user?.userId }
  });

  res.json({ success: true, message: 'Notification removed' });
}
