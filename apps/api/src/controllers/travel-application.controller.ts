import type { Request, Response } from 'express';
import { travelApplicationService } from '../services/travel-application.service';

export const travelApplicationController = {
  async submit(req: Request, res: Response) {
    // req.user is present when the client completed verify-otp first (the
    // intended flow). We still accept anonymous submissions — the trip-form
    // gates the flow behind OTP in the UI, and phone uniqueness is handled
    // at review time.
    const userId = req.user?.id ?? null;
    const result = await travelApplicationService.submit({ userId, data: req.body });
    res.status(201).json({ success: true, data: result });
  },
};
