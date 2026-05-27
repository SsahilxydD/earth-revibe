import { Router, type IRouter } from 'express';
import { adminReviewController } from '../controllers/admin-review.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/products', asyncHandler(adminReviewController.listProductsWithReviewStats));
router.get('/products/:productId', asyncHandler(adminReviewController.listReviewsByProduct));
router.patch('/:id/approval', asyncHandler(adminReviewController.updateApproval));
router.delete('/:id', asyncHandler(adminReviewController.deleteReview));

export { router as adminReviewRouter };
