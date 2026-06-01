import { Router, type IRouter } from 'express';
import { expenseController } from '../controllers/expense.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  UserRole,
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
} from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', validate({ query: expenseQuerySchema }), asyncHandler(expenseController.list));
router.post('/', validate({ body: createExpenseSchema }), asyncHandler(expenseController.create));
router.put('/:id', validate({ body: updateExpenseSchema }), asyncHandler(expenseController.update));
router.delete('/:id', asyncHandler(expenseController.remove));

export { router as adminExpenseRouter };
