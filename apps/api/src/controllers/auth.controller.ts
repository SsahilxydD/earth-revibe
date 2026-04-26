import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  isMobileClient,
} from '../utils/cookies';
import { ApiError } from '../utils/api-error';

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    if (isMobileClient(req)) {
      // Mobile clients store tokens in SecureStore; cookies are set too but
      // ignored by react-native fetch.
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
      return;
    }
    res.json({ success: true, data: result.user });
  },

  async sendOtp(req: Request, res: Response) {
    const result = await authService.sendOtp(req.body);
    res.json({ success: true, message: 'OTP sent', data: result });
  },

  async verifyOtp(req: Request, res: Response) {
    const result = await authService.verifyOtp(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    if (isMobileClient(req)) {
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
      return;
    }
    res.json({ success: true, data: result.user });
  },

  async refresh(req: Request, res: Response) {
    const rawToken = getRefreshTokenFromRequest(req);
    if (!rawToken) {
      throw ApiError.unauthorized('No refresh token');
    }
    const tokens = await authService.refresh(rawToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    if (isMobileClient(req)) {
      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
      return;
    }
    res.json({ success: true });
  },

  async logout(req: Request, res: Response) {
    // Revoke refresh tokens even if the access token has expired.
    // First try the authenticated user; fall back to looking up via refresh token.
    if (req.user?.id) {
      await authService.revokeAllTokens(req.user.id);
    } else {
      const rawRefresh = getRefreshTokenFromRequest(req);
      if (rawRefresh) {
        await authService.revokeByRefreshToken(rawRefresh);
      }
    }
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully' });
  },

  async getMe(req: Request, res: Response) {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  },

  async updateProfile(req: Request, res: Response) {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: user });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body);
    res.json({ success: true, message: 'Password changed successfully' });
  },
};
