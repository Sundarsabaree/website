import { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().max(30).optional(),
  department: z.string().trim().max(100).optional(),
  avatar: z.string().max(500).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128),
});

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  phone: true,
  department: true,
  status: true,
  createdAt: true,
  organizationId: true,
  managerId: true,
  organization: { select: { id: true, name: true } },
  manager: { select: { id: true, name: true } },
} as const;

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: PROFILE_SELECT,
  });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const activities = await prisma.activity.findMany({
    where: { userId: user.id, organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({ success: true, data: { ...user, activities } });
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { name, phone, department, avatar } = req.body as z.infer<
    typeof updateProfileSchema
  >;

  // Role, status, organisation and manager can never be changed from here.
  const updated = await prisma.user.update({
    where: { id: actor.userId },
    data: { name, phone, department, avatar },
    select: PROFILE_SELECT,
  });

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "PROFILE_UPDATED",
    entityType: "User",
    entityId: updated.id,
    details: `${updated.name} updated their profile information`,
  });

  res.json({ success: true, data: updated });
}

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { currentPassword, newPassword } = req.body as z.infer<
    typeof changePasswordSchema
  >;

  const user = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    res
      .status(400)
      .json({ success: false, message: "Current password does not match." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Sign out other sessions/devices that still hold a refresh token.
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);

  await logActivity({
    userId: actor.userId,
    organizationId: actor.organizationId,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: user.id,
    details: `${user.name} changed their security password`,
  });

  res.json({ success: true, message: "Password updated successfully." });
}
