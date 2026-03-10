import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@earth-revibe/db";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { getAccessTokenFromRequest } from "../utils/cookies";
import type { UserRole } from "@earth-revibe/shared";

interface JwtPayload {
  userId: string;
  role: string;
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

// Supabase JWKS for ES256 token verification — cached automatically by jose
const SUPABASE_JWKS = env.SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;

/**
 * Try verifying with custom JWT first, then fall back to Supabase JWT.
 * For Supabase JWTs, auto-provisions the User record if it doesn't exist
 * and reads role from app_metadata — no manual DB setup needed.
 */
async function verifyToken(token: string) {
  // 1. Try custom JWT (app-issued tokens — HS256)
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: userSelect,
    });
    if (user && user.isActive) return user;
  } catch {
    // Not a valid custom JWT — try Supabase
  }

  // 2. Try Supabase JWT (ES256 — verified via JWKS)
  if (SUPABASE_JWKS) {
    try {
      const { payload } = await jwtVerify(token, SUPABASE_JWKS);
      const email = payload.email as string | undefined;
      if (!email) return null;

      // Read role from Supabase app_metadata (set via Supabase dashboard)
      const appMeta = payload.app_metadata as Record<string, any> | undefined;
      const supabaseRole = appMeta?.role as string | undefined;

      // User metadata for display name
      const userMeta = payload.user_metadata as Record<string, any> | undefined;

      // Auto-provision: upsert user on every Supabase-authenticated request.
      // If the user exists, sync the role from app_metadata (source of truth).
      // If the user doesn't exist, create them automatically.
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          // Sync role from Supabase app_metadata if set, otherwise keep DB value
          ...(supabaseRole ? { role: supabaseRole as any } : {}),
          lastLoginAt: new Date(),
        },
        create: {
          email,
          passwordHash: "supabase-managed",
          firstName: userMeta?.first_name || userMeta?.name?.split(" ")[0] || email.split("@")[0],
          lastName: userMeta?.last_name || userMeta?.name?.split(" ").slice(1).join(" ") || "",
          role: (supabaseRole as any) || "CUSTOMER",
          emailVerified: true,
          isActive: true,
          lastLoginAt: new Date(),
        },
        select: userSelect,
      });

      if (user.isActive) return user;
    } catch {
      // Not a valid Supabase JWT either
    }
  }

  return null;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    throw ApiError.unauthorized("No token provided");
  }

  const user = await verifyToken(token);

  if (!user) {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  req.user = user;
  next();
};

/**
 * Optional authentication — sets req.user if a valid token is present,
 * but does NOT reject the request if no token is provided.
 * Used for guest-capable endpoints like guest checkout.
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    return next();
  }

  const user = await verifyToken(token);
  if (user) {
    req.user = user;
  }

  next();
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }

    if (!roles.includes(req.user.role as UserRole)) {
      throw ApiError.forbidden("Insufficient permissions");
    }

    next();
  };
};
