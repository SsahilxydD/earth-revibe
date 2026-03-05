import { Router, type IRouter } from "express";
import { referralController } from "../controllers/referral.controller";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

const router: IRouter = Router();

router.use(authenticate);

router.get("/code", asyncHandler(referralController.getMyReferralCode));
router.get("/my-referrals", asyncHandler(referralController.getMyReferrals));
router.get("/referred-by", asyncHandler(referralController.getReferredBy));

export { router as referralRouter };
