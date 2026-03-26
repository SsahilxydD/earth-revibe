import { Router, type IRouter } from 'express';
import { productController } from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  productVariantSchema,
  addProductImageSchema,
  UserRole,
} from '@earth-revibe/shared';
import { z } from 'zod';

const router: IRouter = Router();

// Public routes
router.get(
  '/',
  validate({ query: productQuerySchema }),
  asyncHandler(productController.listProducts)
);

// Admin routes — static segments MUST come before /:slug and /:id to avoid conflicts
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: createProductSchema }),
  asyncHandler(productController.createProduct)
);

// Variant routes (admin only) — "/variants/:variantId" must precede "/:id"
router.put(
  '/variants/:variantId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: productVariantSchema.partial() }),
  asyncHandler(productController.updateProductVariant)
);
router.delete(
  '/variants/:variantId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.deleteProductVariant)
);

// Image routes (admin only) — "/images/:imageId" must precede "/:id"
router.delete(
  '/images/:imageId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.deleteProductImage)
);
router.put(
  '/images/:imageId/primary',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.setProductImagePrimary)
);

// Routes with /:id param — AFTER all static segments
router.post(
  '/:id/variants',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: z.object({ variants: z.array(productVariantSchema) }) }),
  asyncHandler(productController.addProductVariants)
);
router.post(
  '/:id/images',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: addProductImageSchema }),
  asyncHandler(productController.addProductImage)
);
router.put(
  '/:id/images/reorder',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.reorderProductImages)
);
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: updateProductSchema }),
  asyncHandler(productController.updateProduct)
);
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.deleteProduct)
);

// Public slug route — LAST, since /:slug matches everything
router.get('/:slug', asyncHandler(productController.getProductBySlug));

export { router as productRouter };
