import type { Request, Response } from "express";
import { referralService } from "../services/referral.service";

export const referralController = {
  async getMyReferralCode(req: Request, res: Response) {
    const result = await referralService.getMyReferralCode(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getMyReferrals(req: Request, res: Response) {
    const result = await referralService.getMyReferrals(req.user!.id);
    res.json({ success: true, data: result });
  },

  async getReferredBy(req: Request, res: Response) {
    const result = await referralService.getReferredBy(req.user!.id);
    res.json({ success: true, data: result });
  },
};
