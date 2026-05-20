import { Router, type IRouter } from 'express';
import { adminOrderController } from '../controllers/admin-order.controller';
import { adminRefundController } from '../controllers/admin-refund.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  adminOrderQuerySchema,
  updateOrderStatusSchema,
  addOrderNoteSchema,
  createManualOrderSchema,
  archiveOrderSchema,
} from '@earth-revibe/shared';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.post('/sync', asyncHandler(adminOrderController.syncOrders));
router.post(
  '/manual',
  validate({ body: createManualOrderSchema }),
  asyncHandler(adminOrderController.createManualOrder)
);
router.get(
  '/',
  validate({ query: adminOrderQuerySchema }),
  asyncHandler(adminOrderController.listOrders)
);
router.get('/:orderNumber', asyncHandler(adminOrderController.getOrder));
router.delete(
  '/:orderNumber',
  validate({ body: archiveOrderSchema }),
  asyncHandler(adminOrderController.archiveOrder)
);
router.post('/:orderNumber/restore', asyncHandler(adminOrderController.restoreOrder));
router.put(
  '/:orderNumber/status',
  validate({ body: updateOrderStatusSchema }),
  asyncHandler(adminOrderController.updateStatus)
);
router.post(
  '/:orderNumber/notes',
  validate({ body: addOrderNoteSchema }),
  asyncHandler(adminOrderController.addNote)
);
router.post('/:orderNumber/refund', asyncHandler(adminRefundController.initiateRefund));

export { router as adminOrderRouter };
