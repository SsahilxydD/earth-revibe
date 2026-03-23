import type { Request, Response } from "express";
import { checkoutService } from "../services/checkout.service";

export const checkoutController = {
  async createMagicOrder(req: Request, res: Response) {
    const userId = req.user?.id ?? null;

    // Magic Checkout: Razorpay collects email during payment,
    // so guest checkout no longer requires email upfront.
    const result = await checkoutService.createMagicOrder(userId, req.body);
    res.status(201).json({ success: true, data: result });
  },

  /** Called by Razorpay's servers — no user auth */
  async shippingInfo(req: Request, res: Response) {
    const result = await checkoutService.getShippingInfo(req.body);
    res.json(result);
  },

  /** Called by Razorpay's servers — no user auth */
  async getPromotions(req: Request, res: Response) {
    const result = await checkoutService.getPromotions(req.body);
    res.json(result);
  },

  /** Called by Razorpay's servers — no user auth */
  async applyPromotion(req: Request, res: Response) {
    const result = await checkoutService.applyPromotion(req.body);
    // If there's an error, Razorpay expects a 200 with error object
    res.json(result);
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = req.user?.id ?? null;
    const result = await checkoutService.verifyMagicPayment(userId, req.body);
    res.json({ success: true, data: result });
  },
};
