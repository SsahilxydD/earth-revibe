import type { Request, Response } from 'express';
import type { WhatsAppBroadcastInput } from '@earth-revibe/shared';
import { whatsAppBroadcastService } from '../services/whatsapp-broadcast.service';
import { ApiError } from '../utils/api-error';

// Process-local guard — a broadcast to thousands of recipients is expensive
// and easy to double-fire with a double-click. Best-effort only: if the API
// scales horizontally this won't cover multi-instance dupes, so eventually
// this should be backed by a Broadcast DB row with a `status` field.
let broadcastInFlight = false;

export const adminWhatsAppController = {
  async broadcastTrip(req: Request, res: Response) {
    if (broadcastInFlight) {
      throw ApiError.conflict('A broadcast is already running. Try again in a moment.');
    }
    broadcastInFlight = true;
    try {
      const input = req.body as WhatsAppBroadcastInput;
      const result = await whatsAppBroadcastService.broadcastTrip(input);
      res.json({ success: true, data: result });
    } finally {
      broadcastInFlight = false;
    }
  },

  async getQuota(_req: Request, res: Response) {
    res.json({ success: true, data: whatsAppBroadcastService.getQuota() });
  },
};
