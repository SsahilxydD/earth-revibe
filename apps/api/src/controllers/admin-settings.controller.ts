import type { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';

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
      checkoutConfig: req.body.checkoutConfig,
      shippingConfig: req.body.shippingConfig,
    });
    res.json({ success: true, data: settings });
  },
};
