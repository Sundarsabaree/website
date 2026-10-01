import { Prisma, Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthUser } from "../types/index.js";

/**
 * Central tenant + team scoping. EVERY controller builds its Prisma `where`
 * from these helpers so that:
 *   ADMIN            -> everything inside their organisation
 *   MANAGER          -> records owned/created by themselves or their Sales Executives
 *   SALES_EXECUTIVE  -> records assigned to / created by themselves
 * organizationId always comes from the authenticated user (DB), never from the request.
 */

/** IDs whose records this user may see. ADMIN => null (meaning "whole organisation"). */
export async function getVisibleUserIds(
  user: AuthUser,
): Promise<string[] | null> {
  if (user.role === Role.ADMIN) return null;
  if (user.role === Role.SALES_EXECUTIVE) return [user.userId];

  const members = await prisma.user.findMany({
    where: { organizationId: user.organizationId, managerId: user.userId },
    select: { id: true },
  });
  return [user.userId, ...members.map((m) => m.id)];
}

export async function customerScope(
  user: AuthUser,
): Promise<Prisma.CustomerWhereInput> {
  const ids = await getVisibleUserIds(user);
  if (!ids) return { organizationId: user.organizationId };
  return {
    organizationId: user.organizationId,
    OR: [{ assignedToId: { in: ids } }, { createdById: { in: ids } }],
  };
}

export async function leadScope(
  user: AuthUser,
): Promise<Prisma.LeadWhereInput> {
  const ids = await getVisibleUserIds(user);
  if (!ids) return { organizationId: user.organizationId };
  return { organizationId: user.organizationId, assignedToId: { in: ids } };
}

export async function dealScope(
  user: AuthUser,
): Promise<Prisma.DealWhereInput> {
  const ids = await getVisibleUserIds(user);
  if (!ids) return { organizationId: user.organizationId };
  return { organizationId: user.organizationId, assignedToId: { in: ids } };
}

export async function taskScope(
  user: AuthUser,
): Promise<Prisma.TaskWhereInput> {
  const ids = await getVisibleUserIds(user);
  if (!ids) return { organizationId: user.organizationId };
  return {
    organizationId: user.organizationId,
    OR: [{ assignedToId: { in: ids } }, { createdById: { in: ids } }],
  };
}

export async function meetingScope(
  user: AuthUser,
): Promise<Prisma.MeetingWhereInput> {
  const ids = await getVisibleUserIds(user);
  if (!ids) return { organizationId: user.organizationId };
  return { organizationId: user.organizationId, hostId: { in: ids } };
}

export async function activityScope(
  user: AuthUser,
): Promise<Prisma.ActivityWhereInput> {
  const ids = await getVisibleUserIds(user);
  if (!ids) return { organizationId: user.organizationId };
  return { organizationId: user.organizationId, userId: { in: ids } };
}

/** Employees visible in the Employees page / assignee dropdowns. */
export async function userScope(
  user: AuthUser,
): Promise<Prisma.UserWhereInput> {
  if (user.role === Role.ADMIN) return { organizationId: user.organizationId };
  if (user.role === Role.MANAGER) {
    return {
      organizationId: user.organizationId,
      OR: [{ id: user.userId }, { managerId: user.userId }],
    };
  }
  // Sales Executive: themselves and their own manager (for reference only)
  return {
    organizationId: user.organizationId,
    OR: [
      { id: user.userId },
      ...(user.managerId ? [{ id: user.managerId }] : []),
    ],
  };
}

/**
 * May `actor` assign work to `targetUserId`?
 *   ADMIN   -> any ACTIVE user in the same organisation
 *   MANAGER -> themselves or their own Sales Executives
 *   SALES_EXECUTIVE -> only themselves
 */
export async function canAssignTo(
  actor: AuthUser,
  targetUserId: string,
): Promise<boolean> {
  if (targetUserId === actor.userId) return true;
  if (actor.role === Role.SALES_EXECUTIVE) return false;

  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      organizationId: actor.organizationId,
      status: "ACTIVE",
    },
    select: { id: true, managerId: true },
  });
  if (!target) return false;
  if (actor.role === Role.ADMIN) return true;
  return target.managerId === actor.userId;
}

/** Verify a related record (customer/lead/deal) is in the actor's scope before linking to it. */
export async function assertRelatedInScope(
  actor: AuthUser,
  related: {
    customerId?: string | null;
    leadId?: string | null;
    dealId?: string | null;
  },
): Promise<string | null> {
  if (related.customerId) {
    const ok = await prisma.customer.findFirst({
      where: { id: related.customerId, ...(await customerScope(actor)) },
      select: { id: true },
    });
    if (!ok) return "Selected customer was not found.";
  }
  if (related.leadId) {
    const ok = await prisma.lead.findFirst({
      where: { id: related.leadId, ...(await leadScope(actor)) },
      select: { id: true },
    });
    if (!ok) return "Selected lead was not found.";
  }
  if (related.dealId) {
    const ok = await prisma.deal.findFirst({
      where: { id: related.dealId, ...(await dealScope(actor)) },
      select: { id: true },
    });
    if (!ok) return "Selected deal was not found.";
  }
  return null;
}
