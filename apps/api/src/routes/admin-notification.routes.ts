import { Router, type IRouter } from "express";
import { adminNotificationController } from "../controllers/admin-notification.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/", asyncHandler(adminNotificationController.getNotifications));
router.get("/count", asyncHandler(adminNotificationController.getNotificationCount));

export { router as adminNotificationRouter };
