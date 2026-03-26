import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '@earth-revibe/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';
import { getAccessTokenFromRequest } from '../utils/cookies';
import type { UserRole } from '@earth-revibe/shared';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

// Lazy-initialized Supabase JWKS
let _supabaseJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getSupabaseJWKS() {
  if (!_supabaseJwks) {
    _supabaseJwks = createRemoteJWKSet(
      new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    );
  }
  return _supabaseJwks;
}

/**
 * Verify a Supabase JWT via JWKS and auto-provision/sync the Prisma User.
 * Reads role from app_metadata and display name from user_metadata.
 */
async function verifyToken(token: string) {
  const jwks = getSupabaseJWKS();

  try {
    const { payload } = await jwtVerify(token, jwks);
    const email = payload.email as string | undefined;
    if (!email) return null;

    // Read role from Supabase app_metadata
    const appMeta = payload.app_metadata as Record<string, any> | undefined;
    const supabaseRole = appMeta?.role as string | undefined;

    // User metadata for display name
    const userMeta = payload.user_metadata as Record<string, any> | undefined;

    // Auto-provision: upsert user on every authenticated request.
    // Syncs role from app_metadata (source of truth).
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        ...(supabaseRole ? { role: supabaseRole as any } : {}),
        lastLoginAt: new Date(),
      },
      create: {
        email,
        passwordHash: 'supabase-managed',
        firstName: userMeta?.first_name || userMeta?.name?.split(' ')[0] || email.split('@')[0],
        lastName: userMeta?.last_name || userMeta?.name?.split(' ').slice(1).join(' ') || '',
        role: (supabaseRole as any) || 'CUSTOMER',
        emailVerified: true,
        isActive: true,
        lastLoginAt: new Date(),
      },
      select: userSelect,
    });

    if (user.isActive) return user;
  } catch (err) {
    logger.error({ err }, 'Supabase JWT verification failed');
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
 * Used for guest-capable endpoints like guest checkout.
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
