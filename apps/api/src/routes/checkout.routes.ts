import { Router, type IRouter } from 'express';
import { checkoutController } from '../controllers/checkout.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { verifyRazorpayCallback } from '../middleware/razorpay-verify';
import { idempotency } from '../middleware/idempotency';
import { asyncHandler } from '../utils/async-handler';
import {
  createMagicCheckoutSchema,
  createCodOrderSchema,
  verifyPaymentSchema,
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

// Razorpay server-to-server callbacks.
//
// No Zod validate() here on purpose: a single 400 from schema rejection can
// trip Razorpay's callback circuit breaker and permanently disable our URL
// on their side (cf. ticket #18726923, commit 021c2a0). Handlers are
// defensive and always return a valid 200 — see checkout.controller.ts.
router.post(
  '/shipping-info',
  verifyRazorpayCallback,
  asyncHandler(checkoutController.shippingInfo)
);

router.post('/promotions', verifyRazorpayCallback, asyncHandler(checkoutController.getPromotions));

router.post(
  '/promotions/apply',
  verifyRazorpayCallback,
  asyncHandler(checkoutController.applyPromotion)
);

// COD order creation — requires auth, no Razorpay
router.post(
  '/create-cod-order',
  authenticate,
  idempotency('checkout/create-cod-order'),
  validate({ body: createCodOrderSchema }),
  asyncHandler(checkoutController.createCodOrderHandler)
);

// Razorpay COD review callback — Basic Auth, no JWT
router.post('/review-order', asyncHandler(checkoutController.reviewCodOrder));

export { router as checkoutRouter };
