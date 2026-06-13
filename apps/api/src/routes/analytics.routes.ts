import { Router, type IRouter } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { ga4Controller } from '../controllers/ga4.controller';
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

// Google Analytics 4 (live website data via the GA Data API)
router.get('/ga/status', asyncHandler(ga4Controller.status));
router.get('/ga/live', asyncHandler(ga4Controller.live));
router.get('/ga/report', asyncHandler(ga4Controller.report));

export { router as analyticsRouter };
