import { Router, type IRouter } from 'express';
import { supportController } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { createTicketSchema, createTicketMessageSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);

router.post(
  '/',
  validate({ body: createTicketSchema }),
  asyncHandler(supportController.createTicket)
);
router.get('/', asyncHandler(supportController.listMyTickets));
router.get('/:ticketNumber', asyncHandler(supportController.getMyTicket));
router.post(
  '/:ticketNumber/messages',
  validate({ body: createTicketMessageSchema }),
  asyncHandler(supportController.addMessage)
);

export { router as supportRouter };
