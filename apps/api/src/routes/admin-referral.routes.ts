import { Router, type IRouter } from 'express';
import { adminReferralController } from '../controllers/admin-referral.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { markReferralPaidSchema, UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// Referral cash payouts (manual): list what's owed, then mark each one paid.
router.get('/payouts', asyncHandler(adminReferralController.listPayouts));
router.post(
  '/:id/mark-paid',
  validate({ body: markReferralPaidSchema }),
  asyncHandler(adminReferralController.markPaid)
);

export { router as adminReferralRouter };
