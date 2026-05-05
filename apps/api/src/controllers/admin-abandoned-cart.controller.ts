import type { Request, Response } from 'express';
import { runAbandonedCartCheck } from '../jobs/abandoned-cart-job';
import {
  listAbandonedCarts,
  sendOneRecovery,
  type AbandonedCartKind,
  type AbandonedCartListParams,
} from '../services/admin-abandoned-cart.service';
import { ApiError } from '../utils/api-error';

export const adminAbandonedCartController = {
  async list(req: Request, res: Response) {
    const q = req.query;
    const params: AbandonedCartListParams = {
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      status: (q.status as 'all' | 'pending' | 'sent') || undefined,
      search: typeof q.search === 'string' ? q.search : undefined,
    };
    const result = await listAbandonedCarts(params);
    res.json({ success: true, data: result });
  },

  async runSweep(_req: Request, res: Response) {
    const result = await runAbandonedCartCheck();
    res.json({ success: true, data: result });
  },

  async sendOne(req: Request, res: Response) {
    const kind = req.params.kind as AbandonedCartKind;
    const id = req.params.id as string;
    if (kind !== 'user' && kind !== 'guest') {
      throw ApiError.badRequest('kind must be "user" or "guest"');
    }
    const result = await sendOneRecovery(kind, id);
    res.json({ success: true, data: result });
  },
};
