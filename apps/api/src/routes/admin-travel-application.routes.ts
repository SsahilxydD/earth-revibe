import { Router, type IRouter } from 'express';
import { adminTravelApplicationController } from '../controllers/admin-travel-application.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  UserRole,
  travelApplicationListQuerySchema,
  travelApplicationUpdateSchema,
} from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get(
  '/',
  validate({ query: travelApplicationListQuerySchema }),
  asyncHandler(adminTravelApplicationController.list)
);
router.get('/export-csv', asyncHandler(adminTravelApplicationController.exportCSV));
router.get('/:id', asyncHandler(adminTravelApplicationController.getOne));
router.patch(
  '/:id',
  validate({ body: travelApplicationUpdateSchema }),
  asyncHandler(adminTravelApplicationController.update)
);

export { router as adminTravelApplicationRouter };
