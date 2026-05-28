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
  createDraftOrderSchema,
  updateDraftOrderSchema,
  verifyDraftCustomerSchema,
  confirmOfflineOrderSchema,
  archiveOrderSchema,
  sendCustomerOtpSchema,
  verifyCustomerOtpSchema,
} from '@earth-revibe/shared';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.post('/sync', asyncHandler(adminOrderController.syncOrders));
router.post(
  '/manual/send-otp',
  validate({ body: sendCustomerOtpSchema }),
  asyncHandler(adminOrderController.sendCustomerOtp)
);
router.post(
  '/manual/verify-otp',
  validate({ body: verifyCustomerOtpSchema }),
  asyncHandler(adminOrderController.verifyCustomerOtp)
);
router.post(
  '/manual',
  validate({ body: createManualOrderSchema }),
  asyncHandler(adminOrderController.createManualOrder)
);
router.post(
  '/manual/draft',
  validate({ body: createDraftOrderSchema }),
  asyncHandler(adminOrderController.createDraftOrder)
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
// Two-phase offline drafts: verify the temp customer, then confirm.
router.post(
  '/:orderNumber/customer/send-otp',
  asyncHandler(adminOrderController.sendDraftCustomerOtp)
);
router.post(
  '/:orderNumber/customer/verify-otp',
  validate({ body: verifyDraftCustomerSchema }),
  asyncHandler(adminOrderController.verifyDraftCustomer)
);
router.post(
  '/:orderNumber/confirm',
  validate({ body: confirmOfflineOrderSchema }),
  asyncHandler(adminOrderController.confirmOfflineOrder)
);
// Edit a still-DRAFT offline order (items / temp customer / totals) before confirm.
router.put(
  '/:orderNumber/draft',
  validate({ body: updateDraftOrderSchema }),
  asyncHandler(adminOrderController.updateDraftOrder)
);
router.post('/:orderNumber/refund', asyncHandler(adminRefundController.initiateRefund));

export { router as adminOrderRouter };
