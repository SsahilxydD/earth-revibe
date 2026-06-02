import type { Request, Response } from 'express';
import { returnService } from '../services/return.service';
import type {
  CreateReturnRequestInput,
  UpdateReturnStatusInput,
  ReturnQuery,
} from '@earth-revibe/shared';

export const returnController = {
  // ── Customer ──────────────────────────────────────────────────────
  async requestReturn(req: Request, res: Response) {
    const data = await returnService.requestReturn(
      req.user!.id,
      req.params.orderNumber as string,
      req.body as CreateReturnRequestInput
    );
    res.status(201).json({ success: true, data });
  },

  async listMine(req: Request, res: Response) {
    const data = await returnService.listForUser(req.user!.id);
    res.json({ success: true, data });
  },

  async getMine(req: Request, res: Response) {
    const data = await returnService.getForUser(req.user!.id, req.params.id as string);
    res.json({ success: true, data });
  },

  // ── Admin ─────────────────────────────────────────────────────────
  async adminList(_req: Request, res: Response) {
    const data = await returnService.listAll(
      (res.locals.validatedQuery || _req.query) as ReturnQuery
    );
    res.json({ success: true, data });
  },

  async adminGet(req: Request, res: Response) {
    const data = await returnService.getOne(req.params.id as string);
    res.json({ success: true, data });
  },

  async adminUpdateStatus(req: Request, res: Response) {
    const data = await returnService.updateStatus(
      req.params.id as string,
      req.user!.id,
      req.body as UpdateReturnStatusInput
    );
    res.json({ success: true, data });
  },
};
