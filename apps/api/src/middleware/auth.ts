import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@earth-revibe/db";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { getAccessTokenFromRequest } from "../utils/cookies";
import type { UserRole } from "@earth-revibe/shared";

interface JwtPayload {
  userId: string;
  role: string;
}

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  role: string;
  aud: string;
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

/**
 * Try verifying with custom JWT first, then fall back to Supabase JWT.
 * Returns the authenticated user or null.
 */
async function verifyToken(token: string) {
  // 1. Try custom JWT (app-issued tokens)
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

  // 2. Try Supabase JWT
  if (env.SUPABASE_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
      if (!decoded.email) return null;

      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
        select: userSelect,
      });
      if (user && user.isActive) return user;
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
