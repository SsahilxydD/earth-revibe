import { Router, type IRouter } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { loginRateLimit, registerRateLimit, passwordResetRateLimit } from "../middleware/auth-rate-limit";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "@earth-revibe/shared";

const router: IRouter = Router();

router.post("/register", registerRateLimit, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", loginRateLimit, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.post("/forgot-password", passwordResetRateLimit, validate({ body: forgotPasswordSchema }), asyncHandler(authController.forgotPassword));
router.post("/reset-password", validate({ body: resetPasswordSchema }), asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.getMe));
router.put("/profile", authenticate, validate({ body: updateProfileSchema }), asyncHandler(authController.updateProfile));
router.put("/password", authenticate, validate({ body: changePasswordSchema }), asyncHandler(authController.changePassword));

export { router as authRouter };
