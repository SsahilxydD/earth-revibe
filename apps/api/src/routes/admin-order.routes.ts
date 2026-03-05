import { Router, type IRouter } from "express";
import { adminOrderController } from "../controllers/admin-order.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import {
  adminOrderQuerySchema,
  updateOrderStatusSchema,
  addOrderNoteSchema,
} from "@earth-revibe/shared";
import { UserRole } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/", validate({ query: adminOrderQuerySchema }), asyncHandler(adminOrderController.listOrders));
router.get("/:orderNumber", asyncHandler(adminOrderController.getOrder));
router.put("/:orderNumber/status", validate({ body: updateOrderStatusSchema }), asyncHandler(adminOrderController.updateStatus));
router.post("/:orderNumber/notes", validate({ body: addOrderNoteSchema }), asyncHandler(adminOrderController.addNote));

export { router as adminOrderRouter };
