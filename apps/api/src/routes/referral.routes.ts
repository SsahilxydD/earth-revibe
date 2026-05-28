import { Router, type IRouter } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { updateUpiSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);

router.put('/upi', validate({ body: updateUpiSchema }), asyncHandler(referralController.setUpi));
router.get('/code', asyncHandler(referralController.getMyReferralCode));
router.get('/my-referrals', asyncHandler(referralController.getMyReferrals));
router.get('/referred-by', asyncHandler(referralController.getReferredBy));
router.get('/validate', asyncHandler(referralController.validate));

export { router as referralRouter };
