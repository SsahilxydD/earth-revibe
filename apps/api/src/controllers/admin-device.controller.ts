import type { Request, Response } from 'express';
import { adminDeviceService } from '../services/admin-device.service';
import { ApiError } from '../utils/api-error';

export const adminDeviceController = {
  async register(req: Request, res: Response) {
    const userId = req.user!.id;
    const device = await adminDeviceService.register(userId, req.body);
    res.status(201).json({
      success: true,
      data: { id: device.id, lastSeenAt: device.lastSeenAt },
    });
  },

  async unregister(req: Request, res: Response) {
    const userId = req.user!.id;
    const { expoPushToken } = req.params as { expoPushToken: string };
    if (!expoPushToken) {
      throw ApiError.badRequest('expoPushToken is required');
    }
    await adminDeviceService.unregister(userId, expoPushToken);
    res.json({ success: true });
  },
};
