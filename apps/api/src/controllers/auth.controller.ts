import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { setAccessCookie, clearAuthCookies } from '../utils/cookies';

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    setAccessCookie(res, result.accessToken);
    res.json({ success: true, data: result });
  },

  async sendOtp(req: Request, res: Response) {
    await authService.sendOtp(req.body);
    res.json({ success: true, message: 'OTP sent' });
  },

  async verifyOtp(req: Request, res: Response) {
    const result = await authService.verifyOtp(req.body);
    setAccessCookie(res, result.accessToken);
    res.json({ success: true, data: result });
  },

  async logout(_req: Request, res: Response) {
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
};
