import { Router, type IRouter } from 'express';
import { adminWhatsAppInboundController } from '../controllers/admin-whatsapp-inbound.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminWhatsAppInboundController.list));

export { router as adminWhatsAppInboundRouter };
