import { Router, type IRouter } from 'express';
import { adminCustomerController } from '../controllers/admin-customer.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminCustomerController.listCustomers));
router.get('/export-csv', asyncHandler(adminCustomerController.exportCSV));
router.get('/:id', asyncHandler(adminCustomerController.getCustomer));
router.get('/:id/timeline', asyncHandler(adminCustomerController.getTimeline));
router.put('/:id/toggle-active', asyncHandler(adminCustomerController.toggleActive));

export { router as adminCustomerRouter };
