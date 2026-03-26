import { Router, type IRouter } from 'express';
import { categoryController } from '../controllers/category.controller';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  UserRole,
} from '@earth-revibe/shared';

const router: IRouter = Router();

// Public routes
router.get('/', asyncHandler(categoryController.listCategories));
router.get('/:slug', asyncHandler(categoryController.getCategoryBySlug));

// Admin routes — /reorder BEFORE /:id to avoid route conflicts
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: createCategorySchema }),
  asyncHandler(categoryController.createCategory)
);
router.put(
  '/reorder',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: reorderCategoriesSchema }),
  asyncHandler(categoryController.reorderCategories)
);
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate({ body: updateCategorySchema }),
  asyncHandler(categoryController.updateCategory)
);
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(categoryController.deleteCategory)
);

export { router as categoryRouter };
