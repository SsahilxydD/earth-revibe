import { Router, type IRouter } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { otpRateLimit } from '../middleware/auth-rate-limit';
import {
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@earth-revibe/shared';

const router: IRouter = Router();

router.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));
router.post(
  '/send-otp',
  otpRateLimit,
  validate({ body: sendOtpSchema }),
  asyncHandler(authController.sendOtp)
);
router.post(
  '/verify-otp',
  validate({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp)
);
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', optionalAuthenticate, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.getMe));
router.put(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  asyncHandler(authController.updateProfile)
);
router.put(
  '/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword)
);

export { router as authRouter };
