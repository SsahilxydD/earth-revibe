import type { Request, Response } from 'express';
import { referralService, validateReferralCode } from '../services/referral.service';

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

  async validate(req: Request, res: Response) {
    const code = String(req.query.code ?? '').trim();
    const result = await validateReferralCode(req.user!.id, code);
    res.json({ success: true, data: result });
  },
};
