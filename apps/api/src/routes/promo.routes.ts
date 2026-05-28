import { Router, type IRouter } from 'express';
import { promoController } from '../controllers/promo.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { claimPromoSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

// Public — the /spinner landing reads this before the visitor logs in.
router.get('/:code', asyncHandler(promoController.getCampaign));

// Authenticated — grant the bonus to the logged-in user (one claim per account).
router.post(
  '/claim',
  authenticate,
  validate({ body: claimPromoSchema }),
  asyncHandler(promoController.claim)
);

export { router as promoRouter };
