import { Router, type IRouter } from 'express';
import { shippingController } from '../controllers/shipping.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

// Customer routes
router.get('/track/:orderNumber', authenticate, asyncHandler(shippingController.getTracking));

// Public serviceability check
router.get('/serviceability/:pincode', asyncHandler(shippingController.checkServiceability));

// Admin routes
router.post(
  '/:orderNumber/create-shipment',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(shippingController.createShipment)
);

router.post(
  '/:orderNumber/assign-awb',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(shippingController.assignAWB)
);

router.post(
  '/:orderNumber/label',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(shippingController.generateLabel)
);

router.post(
  '/:orderNumber/manifest',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(shippingController.generateManifest)
);

export { router as shippingRouter };
