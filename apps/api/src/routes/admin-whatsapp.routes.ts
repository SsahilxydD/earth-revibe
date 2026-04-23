import { Router, type IRouter } from 'express';
import { adminWhatsAppController } from '../controllers/admin-whatsapp.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { UserRole, whatsAppBroadcastSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/broadcast-quota', asyncHandler(adminWhatsAppController.getQuota));
router.post(
  '/broadcast-trip',
  validate({ body: whatsAppBroadcastSchema }),
  asyncHandler(adminWhatsAppController.broadcastTrip)
);

export { router as adminWhatsAppRouter };
