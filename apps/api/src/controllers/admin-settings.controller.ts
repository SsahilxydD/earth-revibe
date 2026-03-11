import type { Request, Response } from "express";
import { settingsService } from "../services/settings.service";

export const adminSettingsController = {
  async getSettings(_req: Request, res: Response) {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  },

  async updateSettings(req: Request, res: Response) {
    const settings = await settingsService.updateSettings({
      storeName: req.body.storeName,
      contactEmail: req.body.email,
      contactPhone: req.body.phone,
    });
    res.json({ success: true, data: settings });
  },
};
