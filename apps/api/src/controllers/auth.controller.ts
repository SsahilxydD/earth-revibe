import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { setAuthCookies, clearAuthCookies, getRefreshTokenFromRequest } from "../utils/cookies";
import { ApiError } from "../utils/api-error";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json({ success: true, data: { user: result.user } });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ success: true, data: { user: result.user } });
  },

  async refresh(req: Request, res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw ApiError.unauthorized("No refresh token provided");
    }
    const tokens = await authService.refreshToken(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ success: true, data: { message: "Tokens refreshed" } });
  },

  async logout(req: Request, res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearAuthCookies(res);
    res.json({ success: true, message: "Logged out successfully" });
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    res.json({ success: true, message: "If the email exists, a reset link has been sent" });
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, message: "Password reset successfully" });
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
    clearAuthCookies(res);
    res.json({ success: true, message: "Password changed successfully" });
  },
};
