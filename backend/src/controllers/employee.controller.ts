import { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";
import { userScope } from "../services/scope.service.js";

/**
 * Employees = Users of the caller's organisation.
 *   ADMIN    : creates/edits/deactivates/deletes MANAGERs and SALES_EXECUTIVEs, reassigns SEs between managers.
 *   MANAGER  : creates SALES_EXECUTIVEs (auto-assigned to themselves) and manages only their own SEs.
 *   SALES_EXECUTIVE : read-only (themselves + their manager).
 * `ADMIN` can NEVER be granted through this API, and organizationId is never read from the request.
 */

const EMPLOYEE_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  phone: true,
  department: true,
  status: true,
  createdAt: true,
  managerId: true,
  manager: { select: { id: true, name: true } },
});

const ASSIGNABLE_ROLES = z.enum([Role.MANAGER, Role.SALES_EXECUTIVE]);
const STATUS = z.enum(["ACTIVE", "SUSPENDED"]);

export const employeeSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  role: ASSIGNABLE_ROLES.optional(),
  managerId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(30).optional(),
  department: z.string().trim().max(100).optional(),
  status: STATUS.optional(),
  avatar: z.string().max(500).optional(),
  salesExecutiveIds: z.array(z.string().uuid()).optional(),
});

export const employeeUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .optional(),
  role: ASSIGNABLE_ROLES.optional(),
  managerId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(30).optional(),
  department: z.string().trim().max(100).optional(),
  status: STATUS.optional(),
  avatar: z.string().max(500).optional(),
});

export const managerTeamSchema = z.object({
  salesExecutiveIds: z.array(z.string().uuid()).max(500),
});

async function isActiveManagerInOrg(
  organizationId: string,
  managerId: string,
): Promise<boolean> {
  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      organizationId,
      role: Role.MANAGER,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return manager !== null;
}

async function validateSalesExecutiveIds(
  organizationId: string,
  salesExecutiveIds: string[],
): Promise<string[]> {
  const ids = [...new Set(salesExecutiveIds)];
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      organizationId,
      role: Role.SALES_EXECUTIVE,
    },
    select: { id: true },
  });
  if (users.length !== ids.length) {
    throw new Error(
      "Every selected Sales Executive must belong to your organisation.",
    );
  }
  return ids;
}

function isRole(value: string | undefined): value is Role {
  return (
    value !== undefined && (Object.values(Role) as string[]).includes(value)
  );
}

export async function getEmployees(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { search, role, department, status, managerId, assignable } =
    req.query as Record<string, string | undefined>;

  const and: Prisma.UserWhereInput[] = [await userScope(actor)];

  if (assignable === "true") {
    // Only people this user may assign work to (used by assignee dropdowns).
    and.push({ status: "ACTIVE" });
    if (actor.role === Role.MANAGER)
      and.push({ OR: [{ id: actor.userId }, { managerId: actor.userId }] });
    if (actor.role === Role.SALES_EXECUTIVE) and.push({ id: actor.userId });
  }
  if (isRole(role)) and.push({ role });
  if (department) and.push({ department });
  if (status === "ACTIVE" || status === "SUSPENDED") and.push({ status });
  if (managerId) and.push({ managerId });
  if (search?.trim()) {
    const s = search.trim();
    and.push({
      OR: [
        { name: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { department: { contains: s, mode: "insensitive" } },
      ],
    });
  }

  const employees = await prisma.user.findMany({
    where: { AND: and },
    orderBy: { name: "asc" },
    select: {
      ...EMPLOYEE_SELECT,
      _count: {
        select: {
          assignedCustomers: true,
          assignedLeads: true,
          assignedDeals: true,
          assignedTasks: true,
          teamMembers: true,
        },
      },
    },
  });

  res.json({ success: true, data: employees });
}

export async function getEmployeePerformance(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const now = new Date();

  const employees = await prisma.user.findMany({
    where: {
      AND: [
        await userScope(actor),
        { role: { in: [Role.SALES_EXECUTIVE, Role.MANAGER] } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
      department: true,
      status: true,
      managerId: true,
      assignedDeals: {
        select: { value: true, stage: true, probability: true },
      },
      assignedLeads: { select: { id: true, stage: true } },
      assignedTasks: { select: { id: true, status: true, dueDate: true } },
      assignedCustomers: { select: { id: true, budget: true } },
    },
  });

  const performanceList = employees.map((emp) => {
    const wonDeals = emp.assignedDeals.filter((d) => d.stage === "CLOSED_WON");
    const openDeals = emp.assignedDeals.filter(
      (d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST",
    );
    const totalWonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const totalPipeline = emp.assignedDeals.reduce(
      (sum, d) => sum + d.value,
      0,
    );
    const expectedRevenue = openDeals.reduce(
      (sum, d) => sum + (d.value * d.probability) / 100,
      0,
    );
    const totalTasks = emp.assignedTasks.length;
    const completedTasks = emp.assignedTasks.filter(
      (t) => t.status === "COMPLETED",
    ).length;
    const overdueTasksCount = emp.assignedTasks.filter(
      (t) => t.status !== "COMPLETED" && t.dueDate !== null && t.dueDate < now,
    ).length;
    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      avatar: emp.avatar,
      role: emp.role,
      department: emp.department,
      status: emp.status,
      managerId: emp.managerId,
      totalWonRevenue,
      totalPipeline,
      expectedRevenue,
      dealsWonCount: wonDeals.length,
      openDealsCount: openDeals.length,
      activeLeadsCount: emp.assignedLeads.filter(
        (l) => l.stage !== "WON" && l.stage !== "LOST",
      ).length,
      customerCount: emp.assignedCustomers.length,
      overdueTasksCount,
      taskCompletionRate,
    };
  });

  res.json({ success: true, data: performanceList });
}

export async function createEmployee(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const data = req.body as z.infer<typeof employeeSchema>;
  const requestedRole: Role = data.role ?? Role.SALES_EXECUTIVE;
  const selectedSalesExecutiveIds = data.salesExecutiveIds ?? [];

  if (selectedSalesExecutiveIds.length > 0 && requestedRole !== Role.MANAGER) {
    res.status(400).json({
      success: false,
      message:
        "Sales Executives can only be assigned while creating a Manager.",
    });
    return;
  }
  if (actor.role !== Role.ADMIN && selectedSalesExecutiveIds.length > 0) {
    res.status(403).json({
      success: false,
      message: "Only an Admin can assign Sales Executives to a Manager.",
    });
    return;
  }

  let managerId: string | null = null;

  if (actor.role === Role.MANAGER) {
    if (requestedRole !== Role.SALES_EXECUTIVE) {
      res.status(403).json({
        success: false,
        message: "Managers can only create Sales Executives.",
      });
      return;
    }
    if (data.managerId && data.managerId !== actor.userId) {
      res.status(403).json({
        success: false,
        message: "Managers can only add Sales Executives to their own team.",
      });
      return;
    }
    managerId = actor.userId;
  } else if (requestedRole === Role.SALES_EXECUTIVE && data.managerId) {
    if (!(await isActiveManagerInOrg(actor.organizationId, data.managerId))) {
      res.status(400).json({
        success: false,
        message: "Selected manager was not found in your organisation.",
      });
      return;
    }
    managerId = data.managerId;
  }

  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    res.status(409).json({
      success: false,
      message: "A user with this email already exists.",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const teamIds =
      requestedRole === Role.MANAGER && selectedSalesExecutiveIds.length > 0
        ? await validateSalesExecutiveIds(
            actor.organizationId,
            selectedSalesExecutiveIds,
          )
        : [];
    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.name,
          email,
          passwordHash,
          role: requestedRole,
          organizationId: actor.organizationId,
          managerId,
          phone: data.phone,
          department: data.department || "Sales",
          avatar:
            data.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name.replace(/\s+/g, ""))}`,
          status: data.status || "ACTIVE",
        },
      });
      if (teamIds.length > 0) {
        await tx.user.updateMany({
          where: {
            id: { in: teamIds },
            organizationId: actor.organizationId,
            role: Role.SALES_EXECUTIVE,
          },
          data: { managerId: created.id },
        });
      }
      return tx.user.findUnique({
        where: { id: created.id },
        select: EMPLOYEE_SELECT,
      });
    });

    if (!employee) throw new Error("Employee could not be created.");

    await logActivity({
      userId: actor.userId,
      organizationId: actor.organizationId,
      action: "EMPLOYEE_ADDED",
      entityType: "User",
      entityId: employee.id,
      details: `Added new ${employee.role === Role.MANAGER ? "manager" : "sales executive"} ${employee.name}${employee.manager ? ` under ${employee.manager.name}` : ""}`,
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
      return;
    }
    throw error;
  }
}

export async function updateManagerTeam(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const managerId = req.params.id as string;
  const { salesExecutiveIds } = req.body as z.infer<typeof managerTeamSchema>;

  if (actor.role !== Role.ADMIN) {
    res.status(403).json({
      success: false,
      message: "Only an Admin can assign Sales Executives to a Manager.",
    });
    return;
  }

  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      organizationId: actor.organizationId,
      role: Role.MANAGER,
    },
    select: { id: true, name: true },
  });
  if (!manager) {
    res.status(404).json({ success: false, message: "Manager not found." });
    return;
  }

  let selectedIds: string[];
  try {
    selectedIds = await validateSalesExecutiveIds(
      actor.organizationId,
      salesExecutiveIds,
    );
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Invalid team selection.",
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: {
        organizationId: actor.organizationId,
        role: Role.SALES_EXECUTIVE,
        managerId: manager.id,
      },
      data: { managerId: null },
    });
    if (selectedIds.length > 0) {
      await tx.user.updateMany({
        where: {
          id: { in: selectedIds },
          organizationId: actor.organizationId,
          role: Role.SALES_EXECUTIVE,
        },
        data: { managerId: manager.id },
      });
    }
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "EMPLOYEE_TEAM_UPDATED",
    entityType: "User",
    entityId: manager.id,
    details: `Updated ${manager.name}'s Sales Executive team (${selectedIds.length} assigned)`,
  });

  const updatedManager = await prisma.user.findUnique({
    where: { id: manager.id },
    select: {
      ...EMPLOYEE_SELECT,
      teamMembers: {
        where: { role: Role.SALES_EXECUTIVE },
        select: { id: true, name: true, email: true, managerId: true },
        orderBy: { name: "asc" },
      },
    },
  });
  res.json({ success: true, data: updatedManager });
}

export async function updateEmployee(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;
  const data = req.body as z.infer<typeof employeeUpdateSchema>;

  // Tenant-scoped lookup: an id from another organisation is simply "not found".
  const target = await prisma.user.findFirst({
    where: { id, organizationId: actor.organizationId },
  });
  if (!target) {
    res.status(404).json({ success: false, message: "Employee not found" });
    return;
  }

  const isSelf = target.id === actor.userId;

  if (actor.role === Role.MANAGER) {
    // Managers only touch their own Sales Executives (other managers are invisible -> 404).
    if (
      target.role !== Role.SALES_EXECUTIVE ||
      target.managerId !== actor.userId
    ) {
      res.status(404).json({ success: false, message: "Employee not found" });
      return;
    }
    if (data.role !== undefined && data.role !== Role.SALES_EXECUTIVE) {
      res
        .status(403)
        .json({ success: false, message: "Managers cannot change roles." });
      return;
    }
    if (data.managerId !== undefined && data.managerId !== actor.userId) {
      res.status(403).json({
        success: false,
        message: "Only an Admin can move a Sales Executive to another manager.",
      });
      return;
    }
  }

  if (target.role === Role.ADMIN) {
    if (!isSelf) {
      res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified by other users.",
      });
      return;
    }
    if (
      data.role !== undefined ||
      data.status !== undefined ||
      data.managerId !== undefined
    ) {
      res.status(403).json({
        success: false,
        message: "You cannot change your own role, status or manager.",
      });
      return;
    }
  }

  if (isSelf && data.status === "SUSPENDED") {
    res.status(400).json({
      success: false,
      message: "You cannot deactivate your own account.",
    });
    return;
  }

  const newRole: Role =
    target.role === Role.ADMIN ? Role.ADMIN : (data.role ?? target.role);
  let newManagerId: string | null = target.managerId;

  if (newRole === Role.MANAGER || newRole === Role.ADMIN) {
    newManagerId = null;
  } else if (data.managerId !== undefined) {
    if (
      data.managerId !== null &&
      !(await isActiveManagerInOrg(actor.organizationId, data.managerId))
    ) {
      res.status(400).json({
        success: false,
        message: "Selected manager was not found in your organisation.",
      });
      return;
    }
    newManagerId = data.managerId;
  }

  if (target.role === Role.MANAGER && newRole === Role.SALES_EXECUTIVE) {
    const teamSize = await prisma.user.count({
      where: { organizationId: actor.organizationId, managerId: target.id },
    });
    if (teamSize > 0) {
      res.status(409).json({
        success: false,
        message:
          "Reassign this manager's Sales Executives before changing their role.",
      });
      return;
    }
  }

  const updateData: Prisma.UserUncheckedUpdateInput = {
    name: data.name,
    phone: data.phone,
    department: data.department,
    status: data.status,
    avatar: data.avatar,
    role: newRole,
    managerId: newManagerId,
  };
  if (data.password)
    updateData.passwordHash = await bcrypt.hash(data.password, 10);

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: updateData,
    select: EMPLOYEE_SELECT,
  });

  // Deactivation or password change must end existing sessions.
  if (data.status === "SUSPENDED" || data.password) {
    await prisma.refreshToken.deleteMany({ where: { userId: target.id } });
  }

  const managerChanged = newManagerId !== target.managerId;
  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: managerChanged
      ? "EMPLOYEE_REASSIGNED"
      : data.status === "SUSPENDED"
        ? "EMPLOYEE_DEACTIVATED"
        : "EMPLOYEE_UPDATED",
    entityType: "User",
    entityId: updated.id,
    details: managerChanged
      ? `${updated.name} now reports to ${updated.manager?.name ?? "no manager"}`
      : data.status === "SUSPENDED"
        ? `Deactivated ${updated.name}`
        : `Updated details for ${updated.name} (Role: ${updated.role})`,
  });

  res.json({ success: true, data: updated });
}

export async function deleteEmployee(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const id = req.params.id as string;

  if (actor.userId === id) {
    res
      .status(400)
      .json({ success: false, message: "You cannot delete your own account." });
    return;
  }

  const target = await prisma.user.findFirst({
    where: { id, organizationId: actor.organizationId },
  });
  if (!target) {
    res.status(404).json({ success: false, message: "Employee not found" });
    return;
  }
  if (target.role === Role.ADMIN) {
    res
      .status(403)
      .json({ success: false, message: "Admin accounts cannot be deleted." });
    return;
  }

  const teamSize = await prisma.user.count({
    where: { organizationId: actor.organizationId, managerId: target.id },
  });
  if (teamSize > 0) {
    res.status(409).json({
      success: false,
      message: "Reassign this manager's Sales Executives before deleting them.",
    });
    return;
  }

  // Their customers/leads/deals/tasks become unassigned (FK is SetNull), not deleted.
  await prisma.user.delete({ where: { id: target.id } });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "EMPLOYEE_DELETED",
    entityType: "User",
    entityId: id,
    details: `Deleted employee ${target.name}`,
  });

  res.json({ success: true, message: "Employee deleted successfully" });
}
