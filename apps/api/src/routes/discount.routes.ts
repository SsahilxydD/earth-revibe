import { Router, type IRouter } from 'express';
import { discountController } from '../controllers/discount.controller';
import { optionalAuthenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { validateDiscountSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

// Discount validation is public — guests can check codes on the cart page
// and Magic Checkout also validates coupons without auth
router.post(
  '/validate',
  optionalAuthenticate,
  validate({ body: validateDiscountSchema }),
  asyncHandler(discountController.validateDiscount)
);

// ─── Razorpay Magic Checkout coupon endpoints ────────────────────────────────
// These match Razorpay's expected request/response format for coupon integration.
// Docs: https://razorpay.com/docs/payments/magic-checkout/coupons/

// GET promotions — Razorpay calls this to list available coupons
router.post(
  '/razorpay/get-promotions',
  asyncHandler(discountController.razorpayGetPromotions)
);

// APPLY promotion — Razorpay calls this when user applies a coupon
router.post(
  '/razorpay/apply-promotion',
  asyncHandler(discountController.razorpayApplyPromotion)
);

export { router as discountRouter };
