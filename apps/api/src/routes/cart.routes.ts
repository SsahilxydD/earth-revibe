import { Router, type IRouter } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { addToCartSchema, updateCartItemSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);

router.get('/', asyncHandler(cartController.getCart));
router.post('/items', validate({ body: addToCartSchema }), asyncHandler(cartController.addItem));
router.put(
  '/items/:variantId',
  validate({ body: updateCartItemSchema }),
  asyncHandler(cartController.updateItem)
);
router.delete('/items/:variantId', asyncHandler(cartController.removeItem));
router.delete('/', asyncHandler(cartController.clearCart));

export { router as cartRouter };
