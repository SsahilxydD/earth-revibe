import type { Request, Response } from "express";
import { checkoutService } from "../services/checkout.service";
import { getRazorpay } from "../config/razorpay";
import { env } from "../config/env";

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

  /**
   * Create a temporary ₹1 Magic Checkout order for address collection.
   * Razorpay handles phone → OTP → address. When the user dismisses the
   * modal (or completes), the frontend captures the address from the
   * Razorpay response. The ₹1 order is never fulfilled.
   */
  async createAddressCollectionOrder(_req: Request, res: Response) {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: 100, // ₹1 in paise — minimum amount for Magic Checkout
      currency: "INR",
      receipt: `addr_${Date.now()}`,
      line_items_total: 100,
      line_items: [
        {
          type: "e-commerce" as any,
          sku: "address-collection",
          name: "Address Verification",
          description: "Verify your address",
          quantity: 1,
          price: 100,
          offer_price: 100,
        },
      ],
      notes: { purpose: "address_collection" },
    } as any);

    res.json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        amount: 100,
      },
    });
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = req.user?.id ?? null;
    const result = await checkoutService.verifyMagicPayment(userId, req.body);
    res.json({ success: true, data: result });
  },
};
