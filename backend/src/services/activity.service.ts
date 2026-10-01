import { prisma } from "../prisma.js";
import { Role } from "@prisma/client";

const TEAM_ACTIVITY_ACTIONS = new Set([
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_REASSIGNED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_REASSIGNED",
  "LEAD_STAGE_CHANGED",
  "DEAL_CREATED",
  "DEAL_UPDATED",
  "DEAL_REASSIGNED",
  "DEAL_STAGE_CHANGED",
  "DEAL_CLOSED_WON",
  "DEAL_CLOSED_LOST",
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_REASSIGNED",
  "TASK_ASSIGNED",
  "TASK_COMPLETED",
  "MEETING_SCHEDULED",
  "MEETING_UPDATED",
]);

/**
 * Single activity/timeline writer for the whole app.
 * organizationId is derived from the acting user when not supplied, so existing
 * call sites keep working while every Activity row still belongs to a tenant.
 */
export async function logActivity(params: {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  notifyManager?: boolean;
}) {
  try {
    let organizationId = params.organizationId ?? null;
    let actor: {
      name: string;
      role: Role;
      managerId: string | null;
      organizationId: string | null;
    } | null = null;
    if (!organizationId && params.userId) {
      actor = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          name: true,
          role: true,
          managerId: true,
          organizationId: true,
        },
      });
      organizationId = actor?.organizationId ?? null;
    } else if (params.userId) {
      actor = await prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          name: true,
          role: true,
          managerId: true,
          organizationId: true,
        },
      });
    }

    const activity = await prisma.activity.create({
      data: {
        userId: params.userId || null,
        organizationId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details,
      },
    });

    if (
      params.notifyManager !== false &&
      params.userId &&
      actor?.role === Role.SALES_EXECUTIVE &&
      actor.managerId &&
      TEAM_ACTIVITY_ACTIONS.has(params.action)
    ) {
      const manager = await prisma.user.findFirst({
        where: {
          id: actor.managerId,
          organizationId,
          role: Role.MANAGER,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (manager) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            title: `${actor.name} updated the team`,
            message: `${actor.name}: ${params.details}`,
            type: "SYSTEM",
            link: "/dashboard",
          },
        });
      }
    }

    return activity;
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
