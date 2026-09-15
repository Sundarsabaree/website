import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logActivity } from '../services/activity.service.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  department: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, phone, department } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? 'ADMIN' : 'SALES_EXECUTIVE';

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      phone,
      department: department || 'Sales'
    }
  });

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 86400000)
    }
  });

  await logActivity({
    userId: user.id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user.id,
    details: `${user.name} registered as ${user.role}`
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department
      },
      accessToken,
      refreshToken
    }
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });

  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  if (user.status !== 'ACTIVE') {
    res.status(403).json({ success: false, message: 'Account is deactivated. Contact an administrator.' });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({ success: false, message: 'Invalid email or password.' });
    return;
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 86400000)
    }
  });

  await logActivity({
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    details: `${user.name} logged into the CRM`
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department
      },
      accessToken,
      refreshToken
    }
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token is required.' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
      return;
    }

    // Token rotation
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newPayload = { userId: payload.userId, email: payload.email, role: payload.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 86400000)
      }
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token.' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }
  res.json({ success: true, message: 'Successfully logged out.' });
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
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
      createdAt: true
    }
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  res.json({ success: true, data: user });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  
  // Return success even if email not found for security purposes
  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been dispatched.',
    demoResetToken: user ? `reset-${user.id.substring(0, 8)}` : null
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash }
  });

  res.json({ success: true, message: 'Password updated successfully. You can now login.' });
}
