import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

const ACCESS_COOKIE = 'access_token';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'strict',
};

export function setAccessCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, {
    ...baseCookieOptions,
    path: '/',
  });
}

export function getAccessTokenFromRequest(req: {
  cookies?: Record<string, string>;
  headers: { authorization?: string };
}): string | null {
  // 1. Try httpOnly cookie first
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;

  // 2. Fall back to Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}
