import { Router, type IRouter } from "express";
import { adminProductController } from "../controllers/admin-product.controller";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";
import { UserRole, productQuerySchema } from "@earth-revibe/shared";

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get("/", validate({ query: productQuerySchema }), asyncHandler(adminProductController.listProducts));
router.get("/export-csv", asyncHandler(adminProductController.exportCSV));
router.get("/:slug", asyncHandler(adminProductController.getProduct));
router.post("/import-csv", asyncHandler(adminProductController.importCSV));
router.put("/bulk-update", asyncHandler(adminProductController.bulkUpdate));

export { router as adminProductRouter };
