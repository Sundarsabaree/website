import { Response } from "express";
import { z } from "zod";
import {
  LeadStage,
  NotificationType,
  Prisma,
  Priority,
  Role,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";
import { createNotification } from "../services/notification.service.js";
import {
  assertRelatedInScope,
  canAssignTo,
  leadScope,
} from "../services/scope.service.js";
import { optionalDate, parseDate } from "../utils/validation.js";

/**
 * Lead access: ADMIN = organisation, MANAGER = own + team's leads, SALES_EXECUTIVE = assigned leads.
 * Lifecycle (existing enum): NEW -> CONTACTED -> QUALIFIED -> (PROPOSAL -> NEGOTIATION) -> WON ("Converted") / LOST.
 */

const leadFields = {
  title: z.string().trim().min(2, "Title is required").max(200),
  contactName: z.string().trim().min(2, "Contact name is required").max(150),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(150).optional(),
  value: z.coerce.number().min(0, "Value cannot be negative").optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  priority: z.nativeEnum(Priority).optional(),
  notes: z.string().max(5000).optional(),
  followUpDate: optionalDate,
  assignedToId: z.string().min(1).nullable().optional(),
  customerId: z.string().min(1).nullable().optional(),
};

export const leadSchema = z.object(leadFields);
export const leadUpdateSchema = z.object(leadFields).partial();
export const leadStageSchema = z.object({ stage: z.nativeEnum(LeadStage) });

const LEAD_INCLUDE = {
  assignedTo: { select: { id: true, name: true, email: true, avatar: true } },
  customer: { select: { id: true, name: true, company: true } },
} satisfies Prisma.LeadInclude;

export async function getLeads(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { stage, priority, assignedToId, customerId, search } =
    req.query as Record<string, string | undefined>;

  const and: Prisma.LeadWhereInput[] = [await leadScope(actor)];
  if (stage && (Object.values(LeadStage) as string[]).includes(stage))
    and.push({ stage: stage as LeadStage });
  if (priority && (Object.values(Priority) as string[]).includes(priority))
    and.push({ priority: priority as Priority });
  if (assignedToId) and.push({ assignedToId });
  if (customerId) and.push({ customerId });
  if (search?.trim()) {
    const s = search.trim();
    and.push({
      OR: [
        { title: { contains: s, mode: "insensitive" } },
        { contactName: { contains: s, mode: "insensitive" } },
        { company: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
      ],
    });
  }

  const leads = await prisma.lead.findMany({
    where: { AND: and },
    orderBy: { updatedAt: "desc" },
    take: 500,
    include: LEAD_INCLUDE,
  });

  res.json({ success: true, data: leads });
}

export async function createLead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const {
    assignedToId: requestedAssignee,
    followUpDate,
    customerId,
    ...rest
  } = req.body as z.infer<typeof leadSchema>;

  const assignedToId = requestedAssignee || actor.userId;
  if (
    assignedToId !== actor.userId &&
    !(await canAssignTo(actor, assignedToId))
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot assign a lead to that user.",
    });
    return;
  }
  const relatedError = await assertRelatedInScope(actor, { customerId });
  if (relatedError) {
    res.status(400).json({ success: false, message: relatedError });
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      ...rest,
      followUpDate: parseDate(followUpDate) ?? null,
      customerId: customerId || null,
      organizationId: actor.organizationId,
      assignedToId,
    },
    include: LEAD_INCLUDE,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "LEAD_CREATED",
    entityType: "Lead",
    entityId: lead.id,
    details: `Created lead "${lead.title}" with value ₹${lead.value}${assignedToId !== actor.userId ? ` assigned to ${lead.assignedTo?.name}` : ""}`,
  });

  if (assignedToId !== actor.userId) {
    await createNotification({
      userId: assignedToId,
      title: "New lead assigned",
      message: `${actor.name} assigned you the lead "${lead.title}".`,
      type: NotificationType.SYSTEM,
      link: "/leads",
    });
  }

  res.status(201).json({ success: true, data: lead });
}

export async function updateLead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const { assignedToId, followUpDate, customerId, ...rest } =
    req.body as z.infer<typeof leadUpdateSchema>;

  const existing = await prisma.lead.findFirst({
    where: { id, ...(await leadScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Lead not found" });
    return;
  }

  const reassigning =
    assignedToId !== undefined && assignedToId !== existing.assignedToId;
  if (reassigning) {
    if (assignedToId === null) {
      if (actor.role === Role.SALES_EXECUTIVE) {
        res
          .status(403)
          .json({ success: false, message: "You cannot unassign a lead." });
        return;
      }
    } else if (!(await canAssignTo(actor, assignedToId))) {
      res.status(403).json({
        success: false,
        message: "You cannot assign a lead to that user.",
      });
      return;
    }
  }
  if (customerId) {
    const relatedError = await assertRelatedInScope(actor, { customerId });
    if (relatedError) {
      res.status(400).json({ success: false, message: relatedError });
      return;
    }
  }

  const updated = await prisma.lead.update({
    where: { id: existing.id },
    data: {
      ...rest,
      ...(followUpDate !== undefined
        ? { followUpDate: parseDate(followUpDate) }
        : {}),
      ...(customerId !== undefined ? { customerId } : {}),
      ...(reassigning ? { assignedToId } : {}),
    },
    include: LEAD_INCLUDE,
  });

  const stageChanged =
    rest.stage !== undefined && rest.stage !== existing.stage;
  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: reassigning
      ? "LEAD_REASSIGNED"
      : stageChanged
        ? "LEAD_STAGE_CHANGED"
        : "LEAD_UPDATED",
    entityType: "Lead",
    entityId: updated.id,
    details: reassigning
      ? `Lead "${updated.title}" ${existing.assignedToId ? "reassigned" : "assigned"} to ${updated.assignedTo?.name ?? "nobody"}`
      : stageChanged
        ? `Moved lead "${updated.title}" from ${existing.stage} to ${updated.stage}`
        : `Updated lead "${updated.title}"`,
  });

  if (reassigning && assignedToId && assignedToId !== actor.userId) {
    await createNotification({
      userId: assignedToId,
      title: existing.assignedToId
        ? "Lead reassigned to you"
        : "New lead assigned",
      message: `${actor.name} assigned you the lead "${updated.title}".`,
      type: NotificationType.SYSTEM,
      link: "/leads",
    });
  }

  res.json({ success: true, data: updated });
}

export async function updateLeadStage(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const { stage } = req.body as z.infer<typeof leadStageSchema>;

  const existing = await prisma.lead.findFirst({
    where: { id, ...(await leadScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Lead not found" });
    return;
  }

  const updated = await prisma.lead.update({
    where: { id: existing.id },
    data: { stage },
    include: LEAD_INCLUDE,
  });

  if (existing.stage !== stage) {
    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action: "LEAD_STAGE_CHANGED",
      entityType: "Lead",
      entityId: updated.id,
      details: `Moved lead "${updated.title}" from ${existing.stage} to ${stage}`,
    });
  }

  res.json({ success: true, data: updated });
}

export async function deleteLead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  const existing = await prisma.lead.findFirst({
    where: { id, ...(await leadScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Lead not found" });
    return;
  }

  await prisma.lead.delete({ where: { id: existing.id } });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "LEAD_DELETED",
    entityType: "Lead",
    entityId: id,
    details: `Deleted lead "${existing.title}"`,
  });

  res.json({ success: true, message: "Lead deleted successfully" });
}
