import type { Request, Response } from 'express';
import { getPublicCampaign, claimPromo } from '../services/promo.service';

export const promoController = {
  // Public: campaign info for the /spinner landing (pre-login).
  async getCampaign(req: Request, res: Response) {
    const result = await getPublicCampaign(String(req.params.code));
    res.json({ success: true, data: result });
  },

  // Authenticated: claim the bonus for the logged-in user.
  async claim(req: Request, res: Response) {
    const result = await claimPromo(req.user!.id, req.body.code);
    res.json({ success: true, data: result });
  },
};
