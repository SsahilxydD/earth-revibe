import type { Request, Response } from "express";
import { authService } from "../services/auth.service";

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: tokens });
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
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
};
