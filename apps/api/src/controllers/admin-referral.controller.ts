import type { Request, Response } from 'express';
import { adminReferralService } from '../services/referral.service';

export const adminReferralController = {
  async listPayouts(req: Request, res: Response) {
    const status = (req.query.status as 'pending' | 'paid' | 'all') || 'pending';
    const result = await adminReferralService.listPayouts(status);
    res.json({ success: true, data: result });
  },

  async markPaid(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminReferralService.markPaid(id, req.body);
    res.json({ success: true, data: result });
  },
};
