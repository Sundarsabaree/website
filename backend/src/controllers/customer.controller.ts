import { Response } from "express";
import { z } from "zod";
import { Prisma, CustomerStatus, Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";
import {
  canAssignTo,
  customerScope,
  dealScope,
  leadScope,
  meetingScope,
  taskScope,
} from "../services/scope.service.js";

/**
 * Customer visibility (enforced here in the query, never in React):
 *   ADMIN -> whole organisation | MANAGER -> own + team's customers | SALES_EXECUTIVE -> own/assigned customers
 * organizationId always comes from the authenticated user.
 */

const customerFields = {
  name: z.string().trim().min(2, "Customer name is required").max(150),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(150).optional(),
  industry: z.string().trim().max(100).optional(),
  budget: z.coerce.number().min(0, "Budget cannot be negative").optional(),
  interest: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  assignedToId: z.string().min(1).nullable().optional(),
  notes: z.string().max(5000).optional(),
};

export const customerSchema = z.object(customerFields);
export const customerUpdateSchema = z.object(customerFields).partial();

function calculateLeadScore(budget: number): string {
  if (budget > 70000) return "Hot Lead 🔥";
  if (budget >= 30000) return "Medium Lead 🟡";
  return "Low Lead 🔵";
}

const SORTABLE = ["name", "budget", "createdAt", "company", "status"] as const;
const MAX_CSV_ROWS = 500;

export async function getCustomers(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const {
    search,
    status,
    industry,
    assignedToId,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = "1",
    limit = "20",
  } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * take;

  // Scope is ANDed with every filter, so search/filters can never widen access.
  const and: Prisma.CustomerWhereInput[] = [await customerScope(actor)];
  if (status && (Object.values(CustomerStatus) as string[]).includes(status))
    and.push({ status: status as CustomerStatus });
  if (industry) and.push({ industry });
  if (assignedToId) and.push({ assignedToId });
  if (search?.trim()) {
    const s = search.trim();
    and.push({
      OR: [
        { name: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
        { company: { contains: s, mode: "insensitive" } },
        { interest: { contains: s, mode: "insensitive" } },
        { city: { contains: s, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.CustomerWhereInput = { AND: and };

  const sortField = (SORTABLE as readonly string[]).includes(sortBy)
    ? sortBy
    : "createdAt";
  const order: Prisma.SortOrder =
    sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: { deals: true, tasks: true, meetings: true, leads: true },
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      items: customers,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    },
  });
}

export async function getCustomerById(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  // findFirst + scope (not findUnique by id) => no IDOR.
  const customer = await prisma.customer.findFirst({
    where: { id, ...(await customerScope(actor)) },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          phone: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      // Related records are scoped too, so a manager/rep only sees what they are allowed to see.
      leads: { where: await leadScope(actor), orderBy: { createdAt: "desc" } },
      deals: { where: await dealScope(actor), orderBy: { createdAt: "desc" } },
      tasks: {
        where: await taskScope(actor),
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      meetings: {
        where: await meetingScope(actor),
        orderBy: { startTime: "asc" },
        include: { host: { select: { id: true, name: true } } },
      },
    },
  });

  if (!customer) {
    res.status(404).json({ success: false, message: "Customer not found" });
    return;
  }

  // Activity timeline for this customer (same organisation only).
  const timeline = await prisma.activity.findMany({
    where: {
      organizationId: actor.organizationId,
      entityType: "Customer",
      entityId: customer.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { id: true, name: true } } },
  });

  res.json({ success: true, data: { ...customer, timeline } });
}

export async function createCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { assignedToId: requestedAssignee, ...data } = req.body as z.infer<
    typeof customerSchema
  >;
  const email = data.email.toLowerCase().trim();
  const budget = data.budget ?? 0;

  const assignedToId = requestedAssignee || actor.userId;
  if (
    assignedToId !== actor.userId &&
    !(await canAssignTo(actor, assignedToId))
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot assign a customer to that user.",
    });
    return;
  }

  const duplicate = await prisma.customer.findFirst({
    where: { organizationId: actor.organizationId, email },
    select: { id: true },
  });
  if (duplicate) {
    res.status(409).json({
      success: false,
      message: "A customer with this email already exists.",
    });
    return;
  }

  const leadScore = calculateLeadScore(budget);

  try {
    const customer = await prisma.customer.create({
      data: {
        ...data,
        email,
        budget,
        leadScore,
        organizationId: actor.organizationId,
        assignedToId,
        createdById: actor.userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      details: `Added new customer ${customer.name} (Budget: ₹${customer.budget}, ${leadScore})`,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "A customer with this email already exists.",
      });
      return;
    }
    throw error;
  }
}

export async function updateCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const { assignedToId, ...data } = req.body as z.infer<
    typeof customerUpdateSchema
  >;

  const existing = await prisma.customer.findFirst({
    where: { id, ...(await customerScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Customer not found" });
    return;
  }

  let newEmail = existing.email;
  if (data.email && data.email.toLowerCase().trim() !== existing.email) {
    newEmail = data.email.toLowerCase().trim();
    const duplicate = await prisma.customer.findFirst({
      where: {
        organizationId: actor.organizationId,
        email: newEmail,
        NOT: { id: existing.id },
      },
      select: { id: true },
    });
    if (duplicate) {
      res.status(409).json({
        success: false,
        message: "Another customer with this email already exists.",
      });
      return;
    }
  }

  // (Re)assignment is authorised separately from ordinary edits.
  const reassigning =
    assignedToId !== undefined && assignedToId !== existing.assignedToId;
  if (reassigning) {
    if (assignedToId === null) {
      if (actor.role === Role.SALES_EXECUTIVE) {
        res
          .status(403)
          .json({ success: false, message: "You cannot unassign a customer." });
        return;
      }
    } else if (!(await canAssignTo(actor, assignedToId))) {
      res.status(403).json({
        success: false,
        message: "You cannot assign a customer to that user.",
      });
      return;
    }
  }

  const leadScore =
    data.budget !== undefined
      ? calculateLeadScore(data.budget)
      : existing.leadScore;

  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      ...data,
      email: newEmail,
      leadScore,
      ...(reassigning ? { assignedToId } : {}),
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: reassigning ? "CUSTOMER_REASSIGNED" : "CUSTOMER_UPDATED",
    entityType: "Customer",
    entityId: updated.id,
    details: reassigning
      ? `Customer ${updated.name} assigned to ${updated.assignedTo?.name ?? "nobody"}`
      : `Updated details for customer ${updated.name}`,
  });

  res.json({ success: true, data: updated });
}

export async function deleteCustomer(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  const existing = await prisma.customer.findFirst({
    where: { id, ...(await customerScope(actor)) },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: "Customer not found" });
    return;
  }

  await prisma.customer.delete({ where: { id: existing.id } });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "CUSTOMER_DELETED",
    entityType: "Customer",
    entityId: id,
    details: `Deleted customer ${existing.name}`,
  });

  res.json({ success: true, message: "Customer deleted successfully" });
}

const csvRowSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
});

export async function importCustomersCsv(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { rows } = req.body as { rows?: Array<Record<string, unknown>> };

  if (!Array.isArray(rows) || rows.length === 0) {
    res
      .status(400)
      .json({ success: false, message: "Invalid or empty CSV data." });
    return;
  }
  if (rows.length > MAX_CSV_ROWS) {
    res.status(400).json({
      success: false,
      message: `Import is limited to ${MAX_CSV_ROWS} rows at a time.`,
    });
    return;
  }

  const str = (v: unknown): string | null =>
    v === undefined || v === null || String(v).trim() === ""
      ? null
      : String(v).trim();

  // Validate rows and collect emails, de-duplicating inside the file.
  const seen = new Set<string>();
  const candidates: Prisma.CustomerCreateManyInput[] = [];
  let skippedCount = 0;

  for (const row of rows) {
    const parsed = csvRowSchema.safeParse({
      name: row?.name,
      email: row?.email,
    });
    if (!parsed.success) {
      skippedCount++;
      continue;
    }
    const email = parsed.data.email.toLowerCase();
    if (seen.has(email)) {
      skippedCount++;
      continue;
    }
    seen.add(email);

    const budget = Math.max(0, Number(row.budget) || 0);
    const rawStatus = str(row.status)?.toUpperCase();
    const status =
      rawStatus &&
      (Object.values(CustomerStatus) as string[]).includes(rawStatus)
        ? (rawStatus as CustomerStatus)
        : CustomerStatus.ACTIVE;

    candidates.push({
      name: parsed.data.name,
      email,
      phone: str(row.phone),
      company: str(row.company),
      industry: str(row.industry) ?? "General",
      budget,
      interest: str(row.interest),
      leadScore: calculateLeadScore(budget),
      address: str(row.address),
      city: str(row.city),
      state: str(row.state),
      country: str(row.country) ?? "India",
      status,
      organizationId: actor.organizationId,
      assignedToId: actor.userId,
      createdById: actor.userId,
    });
  }

  // One query for existing emails in THIS organisation only.
  const existing = await prisma.customer.findMany({
    where: {
      organizationId: actor.organizationId,
      email: { in: candidates.map((c) => c.email) },
    },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email));
  const toCreate = candidates.filter((c) => !existingEmails.has(c.email));
  skippedCount += candidates.length - toCreate.length;

  const { count: createdCount } = await prisma.customer.createMany({
    data: toCreate,
    skipDuplicates: true,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "CSV_IMPORT",
    entityType: "Customer",
    details: `Imported ${createdCount} customers from CSV (${skippedCount} duplicates/invalid skipped)`,
  });

  res.json({
    success: true,
    message: `Successfully imported ${createdCount} customers. ${skippedCount} skipped.`,
    createdCount,
    skippedCount,
  });
}
