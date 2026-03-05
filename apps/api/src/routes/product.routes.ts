import { Router, type IRouter } from "express";
import { productController } from "../controllers/product.controller";
import { validate } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productVariantSchema,
  UserRole,
} from "@earth-revibe/shared";
import { z } from "zod";

const router: IRouter = Router();

// Public routes
router.get("/", validate({ query: productQuerySchema }), asyncHandler(productController.listProducts));
router.get("/:slug", asyncHandler(productController.getProductBySlug));

// Admin routes
router.post("/", authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: createProductSchema }), asyncHandler(productController.createProduct));
router.put("/:id", authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: updateProductSchema }), asyncHandler(productController.updateProduct));
router.delete("/:id", authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(productController.deleteProduct));

// Variant routes (admin only)
router.post("/:id/variants", authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: z.object({ variants: z.array(productVariantSchema) }) }), asyncHandler(productController.addProductVariants));
router.put("/variants/:variantId", authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: productVariantSchema.partial() }), asyncHandler(productController.updateProductVariant));
router.delete("/variants/:variantId", authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(productController.deleteProductVariant));

export { router as productRouter };
