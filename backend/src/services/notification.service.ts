import { prisma } from '../prisma.js';
import { NotificationType } from '@prisma/client';

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || NotificationType.SYSTEM,
        link: params.link
      }
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
