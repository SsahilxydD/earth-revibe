import { Router, type IRouter } from "express";
import { adminInventoryController } from "../controllers/admin-inventory.controller";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/", asyncHandler(adminInventoryController.listInventory));
router.get("/summary", asyncHandler(adminInventoryController.getInventorySummary));
router.put("/bulk", asyncHandler(adminInventoryController.bulkUpdateStock));
router.put("/:variantId/stock", asyncHandler(adminInventoryController.updateStock));
router.post("/:variantId/adjust", asyncHandler(adminInventoryController.adjustStock));

export { router as adminInventoryRouter };
