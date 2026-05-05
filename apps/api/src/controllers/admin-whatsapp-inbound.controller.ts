import type { Request, Response } from 'express';
import { whatsAppInboundQuerySchema } from '@earth-revibe/shared';
import { whatsAppInboundService } from '../services/whatsapp-inbound.service';

export const adminWhatsAppInboundController = {
  async list(req: Request, res: Response) {
    const query = whatsAppInboundQuerySchema.parse(req.query);
    const result = await whatsAppInboundService.listMessages(query);
    res.json({ success: true, data: result });
  },
};
