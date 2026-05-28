import { Router, type IRouter } from 'express';
import { loyaltyController } from '../controllers/loyalty.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router: IRouter = Router();

router.use(authenticate);

router.get('/balance', asyncHandler(loyaltyController.getBalance));
router.get('/history', asyncHandler(loyaltyController.getHistory));
router.get('/summary', asyncHandler(loyaltyController.getSummary));
router.get('/codes', asyncHandler(loyaltyController.getActiveCodes));
router.post('/redeem', asyncHandler(loyaltyController.redeem));

export { router as loyaltyRouter };
