import type { Request, Response } from 'express';
import { loyaltyService } from '../services/loyalty.service';
import { selfRedeem } from '../services/loyalty-redemption.service';

export const loyaltyController = {
  async getBalance(req: Request, res: Response) {
    const result = await loyaltyService.getBalance(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getHistory(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await loyaltyService.getHistory(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  },

  async getSummary(req: Request, res: Response) {
    const result = await loyaltyService.getSummary(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getActiveCodes(req: Request, res: Response) {
    const result = await loyaltyService.getActiveCodes(req.user!.id);
    res.json({ success: true, data: result });
  },

  async redeem(req: Request, res: Response) {
    const result = await selfRedeem(req.user!.id);
    res.json({ success: true, data: result });
  },
};
