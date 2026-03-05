import { Router, type IRouter } from "express";
import { discountController } from "../controllers/discount.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { validateDiscountSchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);

router.post("/validate", validate({ body: validateDiscountSchema }), asyncHandler(discountController.validateDiscount));

export { router as discountRouter };
