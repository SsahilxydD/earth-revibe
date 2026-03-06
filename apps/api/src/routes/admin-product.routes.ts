import { Router, type IRouter } from "express";
import { adminProductController } from "../controllers/admin-product.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/export-csv", asyncHandler(adminProductController.exportCSV));
router.post("/import-csv", asyncHandler(adminProductController.importCSV));
router.put("/bulk-update", asyncHandler(adminProductController.bulkUpdate));

export { router as adminProductRouter };
