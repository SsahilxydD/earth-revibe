import { Router, type IRouter } from 'express';
import { adminDiscountController } from '../controllers/admin-discount.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { UserRole, createDiscountSchema, updateDiscountSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminDiscountController.listDiscounts));
router.get('/:id', asyncHandler(adminDiscountController.getDiscount));
router.post(
  '/',
  validate({ body: createDiscountSchema }),
  asyncHandler(adminDiscountController.createDiscount)
);
router.put(
  '/:id',
  validate({ body: updateDiscountSchema }),
  asyncHandler(adminDiscountController.updateDiscount)
);
router.delete('/:id', asyncHandler(adminDiscountController.deleteDiscount));
router.put('/:id/toggle', asyncHandler(adminDiscountController.toggleActive));

export { router as adminDiscountRouter };
