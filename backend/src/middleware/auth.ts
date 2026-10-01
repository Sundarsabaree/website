import { Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AuthenticatedRequest } from "../types/index.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../prisma.js";

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Missing or malformed token.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  let userId: string;
  try {
    userId = verifyAccessToken(token).userId;
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Access token expired.",
        code: "TOKEN_EXPIRED",
      });
      return;
    }
    res.status(401).json({ success: false, message: "Invalid token." });
    return;
  }

  try {
    // Role, organisation and manager are always read from the DB, never from the token.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        organizationId: true,
        managerId: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      res
        .status(401)
        .json({ success: false, message: "Account not found or deactivated." });
      return;
    }
    if (!user.organizationId) {
      res.status(403).json({
        success: false,
        message:
          "Your account is not linked to an organisation. Contact your administrator.",
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      managerId: user.managerId,
    };
    next();
  } catch (error) {
    console.error("Authentication lookup failed:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export function authorize(allowedRoles: Role[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required." });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message:
          "Forbidden. You do not have permission to perform this action.",
      });
      return;
    }
    next();
  };
}
