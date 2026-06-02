import { Router, type IRouter } from 'express';
import { orderController } from '../controllers/order.controller';
import { returnController } from '../controllers/return.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idempotency } from '../middleware/idempotency';
import { asyncHandler } from '../utils/async-handler';
import {
  createOrderSchema,
  verifyPaymentSchema,
  orderQuerySchema,
  cancelOrderSchema,
  createReturnRequestSchema,
} from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);

router.post(
  '/',
  idempotency('orders/create'),
  validate({ body: createOrderSchema }),
  asyncHandler(orderController.createOrder)
);
router.post(
  '/verify-payment',
  idempotency('orders/verify-payment'),
  validate({ body: verifyPaymentSchema }),
  asyncHandler(orderController.verifyPayment)
);
router.get('/', validate({ query: orderQuerySchema }), asyncHandler(orderController.listOrders));
router.post('/sync', asyncHandler(orderController.syncOrders));
router.get('/:orderNumber', asyncHandler(orderController.getOrder));
router.post(
  '/:orderNumber/cancel',
  validate({ body: cancelOrderSchema }),
  asyncHandler(orderController.cancelOrder)
);
router.post(
  '/:orderNumber/returns',
  validate({ body: createReturnRequestSchema }),
  asyncHandler(returnController.requestReturn)
);

export { router as orderRouter };
