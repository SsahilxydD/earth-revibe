import type { Response, CookieOptions } from 'express';
import { env } from '../config/env';

const isProduction = env.NODE_ENV === 'production';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'strict',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  // Cookie maxAge matches refresh token (7 days) so the browser keeps it around.
  // The JWT inside still expires in 15 min — the client auto-refreshes on 401.
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    path: '/api/v1/auth', // only sent to auth endpoints — reduces exposure
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, {
    ...baseCookieOptions,
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions,
    path: '/api/v1/auth',
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

export function getRefreshTokenFromRequest(req: {
  cookies?: Record<string, string>;
}): string | null {
  return req.cookies?.[REFRESH_COOKIE] || null;
}
