import type { Response, CookieOptions } from "express";
import { env } from "../config/env";
import { APP_CONSTANTS } from "../config/constants";

const isProduction = env.NODE_ENV === "production";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "strict",
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour (matches Supabase JWT default)
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    path: "/api/v1/auth",
    maxAge: APP_CONSTANTS.REFRESH_TOKEN_EXPIRY_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, {
    ...baseCookieOptions,
    path: "/",
  });

  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions,
    path: "/api/v1/auth",
  });
}

export function getAccessTokenFromRequest(req: {
  cookies?: Record<string, string>;
  headers: { authorization?: string };
}): string | null {
  // 1. Try httpOnly cookie first
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;

  // 2. Fall back to Authorization header (backward compat)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return null;
}

export function getRefreshTokenFromRequest(req: {
  cookies?: Record<string, string>;
  body?: { refreshToken?: string };
}): string | null {
  // 1. Try httpOnly cookie first
  const cookieToken = req.cookies?.[REFRESH_COOKIE];
  if (cookieToken) return cookieToken;

  // 2. Fall back to body (backward compat)
  if (req.body?.refreshToken) return req.body.refreshToken;

  return null;
}
