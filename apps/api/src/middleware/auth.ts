import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { prisma } from '@earth-revibe/db';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { getAccessTokenFromRequest } from '../utils/cookies';
import type { UserRole } from '@earth-revibe/shared';

const JWT_SECRET_KEY = new TextEncoder().encode(env.JWT_SECRET);

const userSelect = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

/**
 * Verify the JWT and load the Prisma user.
 */
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    const userId = payload.sub as string | undefined;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (user?.isActive) return user;
  } catch {
    // Invalid or expired token
  }

  return null;
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    throw ApiError.unauthorized('No token provided');
  }

  const user = await verifyToken(token);

  if (!user) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  req.user = user;
  next();
};

/**
 * Optional authentication — sets req.user if a valid token is present,
 * but does NOT reject the request if no token is provided.
 */
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction) => {
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
      throw ApiError.unauthorized('Authentication required');
    }

    if (!roles.includes(req.user.role as UserRole)) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };
};
