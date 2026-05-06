import { Router, type IRouter } from 'express';
import { adminCustomerSegmentController } from '../controllers/admin-customer-segment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminCustomerSegmentController.list));
router.post('/', asyncHandler(adminCustomerSegmentController.create));
router.put('/:id', asyncHandler(adminCustomerSegmentController.update));
router.delete('/:id', asyncHandler(adminCustomerSegmentController.delete));
router.post('/:id/refresh', asyncHandler(adminCustomerSegmentController.refresh));

export { router as adminCustomerSegmentRouter };
