import { Router, type IRouter } from "express";
import { checkoutController } from "../controllers/checkout.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import {
  createMagicCheckoutSchema,
  verifyPaymentSchema,
  shippingInfoRequestSchema,
  getPromotionsRequestSchema,
  applyPromotionRequestSchema,
} from "@earth-revibe/shared";

const router: IRouter = Router();

// Authenticated endpoints (user-facing)
router.post(
  "/create-order",
  authenticate,
  validate({ body: createMagicCheckoutSchema }),
  asyncHandler(checkoutController.createMagicOrder)
);

router.post(
  "/verify-payment",
  authenticate,
  validate({ body: verifyPaymentSchema }),
  asyncHandler(checkoutController.verifyPayment)
);

// Razorpay server-to-server callbacks (no user auth)
router.post(
  "/shipping-info",
  validate({ body: shippingInfoRequestSchema }),
  asyncHandler(checkoutController.shippingInfo)
);

router.post(
  "/promotions",
  validate({ body: getPromotionsRequestSchema }),
  asyncHandler(checkoutController.getPromotions)
);

router.post(
  "/promotions/apply",
  validate({ body: applyPromotionRequestSchema }),
  asyncHandler(checkoutController.applyPromotion)
);

export { router as checkoutRouter };
