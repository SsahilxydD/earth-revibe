import type { Request, Response } from 'express';
import { z } from 'zod';
import { dropAlertService } from '../services/drop-alert.service';

const dispatchSchema = z.object({
  dropName: z.string().min(1).max(120),
  cards: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        productName: z.string().min(1).max(255),
        priceFormatted: z.string().min(1).max(64),
        productSlug: z.string().min(1).max(255),
      })
    )
    .length(3),
});

export const dropAlertController = {
  async getMyStatus(req: Request, res: Response) {
    const result = await dropAlertService.getStatus(req.user!.id);
    res.json({ success: true, data: result });
  },

  async subscribeMe(req: Request, res: Response) {
    const result = await dropAlertService.subscribe(req.user!.id);
    res.status(201).json({ success: true, data: result });
  },

  async unsubscribeMe(req: Request, res: Response) {
    const result = await dropAlertService.unsubscribeByUserId(req.user!.id);
    res.json({ success: true, data: result });
  },

  /**
   * Token-based unsubscribe — invoked from the WhatsApp message's
   * "Stop these alerts" button URL. No auth required.
   */
  async unsubscribeByToken(req: Request, res: Response) {
    const token = req.params.token as string;
    const result = await dropAlertService.unsubscribeByToken(token);
    res.json({ success: true, data: result });
  },

  /**
   * Admin: dry-run preview before triggering a send. Used by the
   * "Send drop alert" button to show eligible count + budget remaining.
   */
  async dryRun(req: Request, res: Response) {
    const productId = req.params.id as string;
    const result = await dropAlertService.dryRun(productId);
    res.json({ success: true, data: result });
  },

  /**
   * Admin: trigger the dispatch. Caller passes the carousel cards in
   * the request body — assembling them is the admin UI's job (reuses
   * Cloudflare Images URLs already on the product).
   */
  async dispatch(req: Request, res: Response) {
    const productId = req.params.id as string;
    const input = dispatchSchema.parse(req.body);
    const result = await dropAlertService.dispatch({
      productId,
      dropName: input.dropName,
      cards: input.cards,
    });
    res.status(202).json({ success: true, data: result });
  },
};
