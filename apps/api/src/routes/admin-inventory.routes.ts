import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { adminInventoryController } from '../controllers/admin-inventory.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const updateStockSchema = z.object({
  stock: z.coerce.number().int().min(0),
});

const adjustStockSchema = z.object({
  variantId: z.string().cuid(),
  adjustment: z.number().int(),
  reason: z.string().optional(),
});

const bulkUpdateStockSchema = z.object({
  updates: z.array(
    z.object({
      variantId: z.string().cuid(),
      stock: z.number().int().min(0),
    })
  ),
});

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminInventoryController.listInventory));
router.get('/summary', asyncHandler(adminInventoryController.getInventorySummary));
// Product-grouped search for the offline-order picker (one row per product).
router.get('/products', asyncHandler(adminInventoryController.searchProductsForPicker));
router.put(
  '/bulk',
  validate({ body: bulkUpdateStockSchema }),
  asyncHandler(adminInventoryController.bulkUpdateStock)
);
router.put(
  '/:variantId/stock',
  validate({ body: updateStockSchema }),
  asyncHandler(adminInventoryController.updateStock)
);
router.post(
  '/:variantId/adjust',
  validate({ body: adjustStockSchema }),
  asyncHandler(adminInventoryController.adjustStock)
);

export { router as adminInventoryRouter };
