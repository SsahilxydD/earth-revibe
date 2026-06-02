import { Router, type IRouter } from 'express';
import { returnController } from '../controllers/return.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { UserRole, returnQuerySchema, updateReturnStatusSchema } from '@earth-revibe/shared';

// ── Customer return routes — mounted at /api/v1/returns ──────────────
// (The create endpoint lives on the order router: POST /orders/:orderNumber/returns.)
const router: IRouter = Router();
router.use(authenticate);
router.get('/', asyncHandler(returnController.listMine));
router.get('/:id', asyncHandler(returnController.getMine));

// ── Admin return routes — mounted at /api/v1/admin/returns ───────────
const adminRouter: IRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));
adminRouter.get(
  '/',
  validate({ query: returnQuerySchema }),
  asyncHandler(returnController.adminList)
);
adminRouter.get('/:id', asyncHandler(returnController.adminGet));
adminRouter.put(
  '/:id/status',
  validate({ body: updateReturnStatusSchema }),
  asyncHandler(returnController.adminUpdateStatus)
);

export { router as returnRouter, adminRouter as adminReturnRouter };
