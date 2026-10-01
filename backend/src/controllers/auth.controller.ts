import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { config } from "../config/index.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { AuthenticatedRequest } from "../types/index.js";
import { logActivity } from "../services/activity.service.js";

const REFRESH_TTL_MS = 7 * 86400000;

/**
 * Public registration = "Create Organisation".
 * There is intentionally NO role field: the creator is always the ADMIN of a brand-new
 * organisation. Any extra keys (role, organizationId, managerId...) are stripped by zod.
 */
export const registerSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, "Organisation name must be at least 2 characters")
      .max(100),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100),
    email: z.string().trim().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  phone: string | null;
  department: string | null;
  organizationId: string | null;
  managerId: string | null;
};

function publicUser(
  user: SessionUser,
  organization: { id: string; name: string } | null,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    department: user.department,
    organizationId: user.organizationId,
    managerId: user.managerId,
    organization,
  };
}

async function issueTokens(user: { id: string; email: string; role: Role }) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    jti: crypto.randomUUID(),
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { organizationName, name, email, password } = req.body as z.infer<
    typeof registerSchema
  >;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    res.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Organisation + its first Admin are created atomically.
    const { organization, user } = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: organizationName },
      });
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: Role.ADMIN,
          organizationId: organization.id,
        },
      });
      return { organization, user };
    });

    const tokens = await issueTokens(user);

    await logActivity({
      userId: user.id,
      organizationId: organization.id,
      action: "ORGANIZATION_CREATED",
      entityType: "Organization",
      entityId: organization.id,
      details: `${user.name} created the organisation "${organization.name}"`,
    });

    res.status(201).json({
      success: true,
      data: {
        user: publicUser(user, {
          id: organization.id,
          name: organization.name,
        }),
        ...tokens,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }
    throw error;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      organization: { select: { id: true, name: true, status: true } },
    },
  });

  if (!user) {
    res
      .status(401)
      .json({ success: false, message: "Invalid email or password." });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res
      .status(401)
      .json({ success: false, message: "Invalid email or password." });
    return;
  }

  if (user.status !== "ACTIVE") {
    res.status(403).json({
      success: false,
      message: "Account is deactivated. Contact an administrator.",
    });
    return;
  }
  if (!user.organization) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not linked to an organisation. Contact your administrator.",
    });
    return;
  }
  if (user.organization.status !== "ACTIVE") {
    res
      .status(403)
      .json({ success: false, message: "This organisation is suspended." });
    return;
  }

  const tokens = await issueTokens(user);

  await logActivity({
    userId: user.id,
    organizationId: user.organization.id,
    action: "USER_LOGIN",
    entityType: "User",
    entityId: user.id,
    details: `${user.name} logged into the CRM`,
  });

  res.json({
    success: true,
    data: {
      user: publicUser(user, {
        id: user.organization.id,
        name: user.organization.name,
      }),
      ...tokens,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res
      .status(400)
      .json({ success: false, message: "Refresh token is required." });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (
      !storedToken ||
      storedToken.userId !== payload.userId ||
      storedToken.expiresAt < new Date()
    ) {
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
      return;
    }

    // Re-read the user so a deactivated user / changed role can never keep refreshing.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || user.status !== "ACTIVE" || !user.organizationId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: payload.userId },
      });
      res
        .status(401)
        .json({ success: false, message: "Account not found or deactivated." });
      return;
    }

    // Token rotation
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const tokens = await issueTokens(user);

    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, message: "Invalid refresh token." });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ success: true, message: "Successfully logged out." });
}

export async function me(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
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
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  res.json({ success: true, data: user });
}

/* ---------------- Password reset ----------------
 * The original endpoints let ANYONE reset ANY account's password knowing only the email
 * (cross-tenant account takeover). They now use a signed, 15-minute, single-use token:
 * the token embeds a fingerprint of the current password hash, so it stops working
 * as soon as the password changes.
 * There is no email service in this project, so the token is only returned in the
 * response outside production (as `demoResetToken`, same field name as before).
 * In production, plug an email sender in where marked below.
 */

function passwordFingerprint(passwordHash: string): string {
  return crypto
    .createHash("sha256")
    .update(passwordHash)
    .digest("hex")
    .slice(0, 16);
}

const RESET_SECRET = `${config.jwtSecret}:password-reset`;

interface ResetPayload {
  userId: string;
  fp: string;
  purpose: "password-reset";
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { email } = req.body as z.infer<typeof forgotPasswordSchema>;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  let resetToken: string | null = null;
  if (user && user.status === "ACTIVE") {
    const payload: ResetPayload = {
      userId: user.id,
      fp: passwordFingerprint(user.passwordHash),
      purpose: "password-reset",
    };
    resetToken = jwt.sign(payload, RESET_SECRET, { expiresIn: "15m" });
    // TODO(production): send `resetToken` to user.email with your email provider here.
  }

  // Always the same response, so emails cannot be enumerated.
  res.json({
    success: true,
    message:
      "If an account exists with this email, a password reset link has been dispatched.",
    demoResetToken: config.nodeEnv !== "production" ? resetToken : undefined,
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { token, password } = req.body as z.infer<typeof resetPasswordSchema>;
  const invalid = () =>
    res.status(400).json({
      success: false,
      message: "Reset link is invalid or has expired.",
    });

  let decoded: ResetPayload;
  try {
    decoded = jwt.verify(token, RESET_SECRET) as ResetPayload;
  } catch {
    invalid();
    return;
  }
  if (decoded.purpose !== "password-reset") {
    invalid();
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (
    !user ||
    user.status !== "ACTIVE" ||
    passwordFingerprint(user.passwordHash) !== decoded.fp
  ) {
    invalid();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }), // sign out everywhere
  ]);

  await logActivity({
    userId: user.id,
    organizationId: user.organizationId,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    details: `${user.name} reset their password`,
  });

  res.json({
    success: true,
    message: "Password updated successfully. You can now login.",
  });
}
