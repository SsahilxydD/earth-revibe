import { Router, type IRouter } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/dashboard", asyncHandler(analyticsController.getDashboardStats));
router.get("/revenue-chart", asyncHandler(analyticsController.getRevenueChart));
router.get("/recent-orders", asyncHandler(analyticsController.getRecentOrders));
router.get("/detailed", asyncHandler(analyticsController.getAnalytics));

export { router as analyticsRouter };
