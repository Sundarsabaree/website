import { prisma } from '../prisma.js';

export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
}) {
  try {
    return await prisma.activity.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
