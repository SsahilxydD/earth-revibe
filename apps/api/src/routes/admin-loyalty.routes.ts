import { Router, type IRouter } from 'express';
import { adminLoyaltyController } from '../controllers/admin-loyalty.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/redemptions', asyncHandler(adminLoyaltyController.list));
router.post('/redemptions', asyncHandler(adminLoyaltyController.create));
router.post('/redemptions/:id/approve', asyncHandler(adminLoyaltyController.approve));
router.post('/redemptions/:id/reject', asyncHandler(adminLoyaltyController.reject));
router.post('/expire-points', asyncHandler(adminLoyaltyController.runExpiry));

export { router as adminLoyaltyRouter };
