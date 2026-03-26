import { Router, type IRouter } from 'express';
import { checkoutController } from '../controllers/checkout.controller';
import { optionalAuthenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { verifyRazorpayCallback } from '../middleware/razorpay-verify';
import { idempotency } from '../middleware/idempotency';
import { asyncHandler } from '../utils/async-handler';
import {
  createMagicCheckoutSchema,
  verifyPaymentSchema,
  shippingInfoRequestSchema,
  getPromotionsRequestSchema,
  applyPromotionRequestSchema,
} from '@earth-revibe/shared';

const router: IRouter = Router();

// Checkout endpoints — support both authenticated and guest users
router.post(
  '/create-order',
  optionalAuthenticate,
  idempotency('checkout/create-order'),
  validate({ body: createMagicCheckoutSchema }),
  asyncHandler(checkoutController.createMagicOrder)
);

router.post(
  '/verify-payment',
  optionalAuthenticate,
  idempotency('checkout/verify-payment'),
  validate({ body: verifyPaymentSchema }),
  asyncHandler(checkoutController.verifyPayment)
);

// Address collection via Razorpay Magic Checkout (phone → OTP → address)
router.post(
  '/address-collection',
  optionalAuthenticate,
  asyncHandler(checkoutController.createAddressCollectionOrder)
);

// Fetch shipping address from a completed Razorpay order
router.get(
  '/order-address/:razorpayOrderId',
  optionalAuthenticate,
  asyncHandler(checkoutController.getOrderAddress)
);

// Razorpay server-to-server callbacks — verify signature before processing
router.post(
  '/shipping-info',
  verifyRazorpayCallback,
  validate({ body: shippingInfoRequestSchema }),
  asyncHandler(checkoutController.shippingInfo)
);

router.post(
  '/promotions',
  verifyRazorpayCallback,
  validate({ body: getPromotionsRequestSchema }),
  asyncHandler(checkoutController.getPromotions)
);

router.post(
  '/promotions/apply',
  verifyRazorpayCallback,
  validate({ body: applyPromotionRequestSchema }),
  asyncHandler(checkoutController.applyPromotion)
);

export { router as checkoutRouter };
