import type { Request, Response } from 'express';
import { discountService } from '../services/discount.service';
import { prisma } from '@earth-revibe/db';
import { logger } from '../config/logger';

export const discountController = {
  async validateDiscount(req: Request, res: Response) {
    const result = await discountService.validateDiscount(req.body, req.user?.id);
    res.json({ success: true, data: result });
  },

  /**
   * Razorpay Magic Checkout — Get available promotions.
   * Razorpay sends: { order_id?, contact?, email? }
   * Expected response: { promotions: [{ code, summary, description, tnc }] }
   */
  async razorpayGetPromotions(_req: Request, res: Response) {
    try {
      const now = new Date();
      const discounts = await prisma.discountCode.findMany({
        where: {
          isActive: true,
          startsAt: { lte: now },
          expiresAt: { gte: now },
        },
        select: {
          code: true,
          description: true,
          type: true,
          value: true,
          minOrderValue: true,
          maxDiscountAmount: true,
        },
        take: 10,
      });

      const promotions = discounts.map((d) => {
        let summary = '';
        if (d.type === 'PERCENTAGE') {
          summary = `${Number(d.value)}% off`;
          if (d.maxDiscountAmount) summary += ` (up to ₹${Number(d.maxDiscountAmount)})`;
        } else if (d.type === 'FLAT') {
          summary = `₹${Number(d.value)} off`;
        } else if (d.type === 'FREE_SHIPPING') {
          summary = 'Free shipping';
        }

        return {
          code: d.code,
          summary,
          description: d.description || summary,
          tnc: d.minOrderValue ? `Min. order ₹${Number(d.minOrderValue)}` : '',
        };
      });

      res.json({ promotions });
    } catch (err) {
      logger.error({ err }, 'Razorpay get-promotions failed');
      res.json({ promotions: [] });
    }
  },

  /**
   * Razorpay Magic Checkout — Apply a promotion.
   * Razorpay sends: { promotion_code, order_id?, order_amount? }
   * Expected response on success: { promotion_applied: true, discount, description }
   * Expected response on failure: { promotion_applied: false, description }
   */
  async razorpayApplyPromotion(req: Request, res: Response) {
    try {
      const { promotion_code, order_amount } = req.body;
      const orderTotal = order_amount ? Number(order_amount) / 100 : 0; // Razorpay sends paise

      const result = await discountService.validateDiscount(
        { code: promotion_code, orderTotal },
        undefined
      );

      res.json({
        promotion_applied: true,
        discount: Math.round(result.discountAmount * 100), // Return in paise
        description: result.description || `${result.code} applied`,
      });
    } catch (err: any) {
      res.json({
        promotion_applied: false,
        description: err?.message || 'Invalid coupon code',
      });
    }
  },
};
