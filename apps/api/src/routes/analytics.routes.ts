import { Router, type IRouter } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { UserRole, analyticsQuerySchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/home', asyncHandler(analyticsController.getHomeDashboard));
router.get('/dashboard', asyncHandler(analyticsController.getDashboardStats));
router.get('/revenue-chart', asyncHandler(analyticsController.getRevenueChart));
router.get('/recent-orders', asyncHandler(analyticsController.getRecentOrders));
router.get(
  '/detailed',
  validate({ query: analyticsQuerySchema }),
  asyncHandler(analyticsController.getAnalytics)
);

export { router as analyticsRouter };
