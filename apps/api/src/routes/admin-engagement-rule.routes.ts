import { Router, type IRouter } from 'express';
import { adminEngagementRuleController } from '../controllers/admin-engagement-rule.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminEngagementRuleController.list));
router.post('/', asyncHandler(adminEngagementRuleController.create));
router.get('/:id', asyncHandler(adminEngagementRuleController.get));
router.put('/:id', asyncHandler(adminEngagementRuleController.update));
router.delete('/:id', asyncHandler(adminEngagementRuleController.delete));

export { router as adminEngagementRuleRouter };
