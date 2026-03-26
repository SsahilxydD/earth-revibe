import { Router, type IRouter } from 'express';
import { adminSupportController } from '../controllers/admin-support.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  updateTicketStatusSchema,
  assignTicketSchema,
  createTicketMessageSchema,
  UserRole,
} from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT_STAFF));

router.get('/', asyncHandler(adminSupportController.listAll));
router.get('/:ticketNumber', asyncHandler(adminSupportController.getTicket));
router.put(
  '/:ticketNumber/status',
  validate({ body: updateTicketStatusSchema }),
  asyncHandler(adminSupportController.updateStatus)
);
router.put(
  '/:ticketNumber/assign',
  validate({ body: assignTicketSchema }),
  asyncHandler(adminSupportController.assignTicket)
);
router.post(
  '/:ticketNumber/messages',
  validate({ body: createTicketMessageSchema }),
  asyncHandler(adminSupportController.reply)
);

export { router as adminSupportRouter };
