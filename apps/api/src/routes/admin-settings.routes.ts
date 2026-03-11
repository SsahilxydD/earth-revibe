import { Router, type IRouter } from "express";
import { adminSettingsController } from "../controllers/admin-settings.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/", asyncHandler(adminSettingsController.getSettings));
router.put("/", asyncHandler(adminSettingsController.updateSettings));

export { router as adminSettingsRouter };
