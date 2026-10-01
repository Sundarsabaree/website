import { Request } from "express";
import { Role } from "@prisma/client";

/** What is signed into the JWT. Never trusted for tenancy — see AuthUser. */
export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Trusted identity. Populated by the `authenticate` middleware from the DATABASE
 * (not from the token), so role / organisation / manager changes take effect
 * immediately and organisation can never be spoofed by the client.
 */
export interface AuthUser extends TokenPayload {
  name: string;
  organizationId: string;
  managerId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
