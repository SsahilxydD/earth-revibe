import type { Request, Response } from 'express';
import {
  createRedemption,
  approveRedemption,
  rejectRedemption,
  listRedemptions,
} from '../services/loyalty-redemption.service';
import { expireOldPoints } from '../services/points-expiry.service';

export const adminLoyaltyController = {
  async list(req: Request, res: Response) {
    const status = req.query.status as
      | 'PENDING'
      | 'APPROVED'
      | 'REJECTED'
      | 'CANCELLED'
      | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await listRedemptions({ status, page, limit });
    res.json({ success: true, data: result });
  },

  async create(req: Request, res: Response) {
    const { userEmail, orderNumber, pointsAmount, notes } = req.body as {
      userEmail?: string;
      orderNumber?: string;
      pointsAmount: number;
      notes?: string;
    };
    const result = await createRedemption({ userEmail, orderNumber, pointsAmount, notes });
    res.status(201).json({ success: true, data: result });
  },

  async approve(req: Request, res: Response) {
    const adminId = req.user!.id;
    const id = String(req.params.id ?? '');
    const result = await approveRedemption(id, adminId);
    res.json({ success: true, data: result });
  },

  async reject(req: Request, res: Response) {
    const adminId = req.user!.id;
    const reason = (req.body as { reason?: string })?.reason;
    const id = String(req.params.id ?? '');
    const result = await rejectRedemption(id, adminId, reason);
    res.json({ success: true, data: result });
  },

  // Admin-triggerable run of the expiry sweep (same logic the cron hits).
  async runExpiry(_req: Request, res: Response) {
    const result = await expireOldPoints();
    res.json({ success: true, data: result });
  },
};
