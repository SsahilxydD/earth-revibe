import { Router, type IRouter } from 'express';
import { adminAbandonedCartController } from '../controllers/admin-abandoned-cart.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminAbandonedCartController.list));
router.post('/run', asyncHandler(adminAbandonedCartController.runSweep));
router.post('/:kind/:id/send', asyncHandler(adminAbandonedCartController.sendOne));

export { router as adminAbandonedCartRouter };
