import { Router, type IRouter } from 'express';
import { adminTemplateVariantController } from '../controllers/admin-template-variant.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminTemplateVariantController.list));
router.post('/', asyncHandler(adminTemplateVariantController.create));
router.put('/:id', asyncHandler(adminTemplateVariantController.update));
router.delete('/:id', asyncHandler(adminTemplateVariantController.delete));

export { router as adminTemplateVariantRouter };
