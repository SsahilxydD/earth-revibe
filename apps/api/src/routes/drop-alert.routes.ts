import { Router, type IRouter } from 'express';
import { dropAlertController } from '../controllers/drop-alert.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

// Routes scattered across two surfaces:
//   /api/v1/me/drop-subscription      — customer self-service (auth required)
//   /api/v1/u/:token                  — token unsubscribe (no auth)
//   /api/v1/admin/products/:id/drop-* — admin-only dispatch + dry-run
//
// Each surface is mounted separately in app.ts so the auth posture is clear
// from the mount line itself.

export const meDropSubscriptionRouter: IRouter = Router();
meDropSubscriptionRouter.use(authenticate);
meDropSubscriptionRouter.get('/', asyncHandler(dropAlertController.getMyStatus));
meDropSubscriptionRouter.post('/', asyncHandler(dropAlertController.subscribeMe));
meDropSubscriptionRouter.delete('/', asyncHandler(dropAlertController.unsubscribeMe));

export const tokenUnsubRouter: IRouter = Router();
tokenUnsubRouter.get('/:token', asyncHandler(dropAlertController.unsubscribeByToken));

export const adminDropAlertRouter: IRouter = Router();
adminDropAlertRouter.use(authenticate);
adminDropAlertRouter.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));
adminDropAlertRouter.get('/:id/drop-alert/dry-run', asyncHandler(dropAlertController.dryRun));
adminDropAlertRouter.post('/:id/drop-alert/dispatch', asyncHandler(dropAlertController.dispatch));
