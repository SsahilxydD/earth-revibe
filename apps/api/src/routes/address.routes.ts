import { Router, type IRouter } from 'express';
import { addressController } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import { addressSchema, updateAddressSchema } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);

router.get('/', asyncHandler(addressController.listAddresses));
router.post('/', validate({ body: addressSchema }), asyncHandler(addressController.createAddress));
router.put(
  '/:id',
  validate({ body: updateAddressSchema }),
  asyncHandler(addressController.updateAddress)
);
router.delete('/:id', asyncHandler(addressController.deleteAddress));

// Mappls address autosuggest proxy (keeps API key server-side)
router.get('/autosuggest', asyncHandler(addressController.autosuggest));
router.get('/reverse-geocode', asyncHandler(addressController.reverseGeocode));

export { router as addressRouter };
