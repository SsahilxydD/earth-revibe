import { Router, type IRouter } from "express";
import { discountController } from "../controllers/discount.controller";
import { optionalAuthenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { validateDiscountSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

// Discount validation is public — guests can check codes on the cart page
// and Magic Checkout also validates coupons without auth
router.post("/validate", optionalAuthenticate, validate({ body: validateDiscountSchema }), asyncHandler(discountController.validateDiscount));

export { router as discountRouter };
