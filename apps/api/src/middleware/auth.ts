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

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    throw ApiError.unauthorized("No token provided");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("User not found or inactive");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized("Invalid or expired token");
  }
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

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Token invalid or expired — proceed as guest
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
