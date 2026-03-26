import { Router, type IRouter } from 'express';
import { addressController } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { addressSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);

router.get('/', asyncHandler(addressController.listAddresses));
router.post('/', validate({ body: addressSchema }), asyncHandler(addressController.createAddress));
router.put(
  '/:id',
  validate({ body: addressSchema.partial() } as any),
  asyncHandler(addressController.updateAddress)
);
router.delete('/:id', asyncHandler(addressController.deleteAddress));

export { router as addressRouter };
