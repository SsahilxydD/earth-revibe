import { Router, type IRouter } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import { loginRateLimit, registerRateLimit } from "../middleware/auth-rate-limit";
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "@earth-revibe/shared";

const router: IRouter = Router();

router.post("/register", registerRateLimit, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", loginRateLimit, validate({ body: loginSchema }), asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
// forgot-password is handled by the browser's Supabase client directly (PKCE flow).
// The API endpoint is removed to prevent split-brain: two competing reset emails
// with different PKCE code verifiers. See: 1c15236
// router.post("/forgot-password", ...);
router.post("/reset-password", validate({ body: resetPasswordSchema }), asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.getMe));
router.put("/profile", authenticate, validate({ body: updateProfileSchema }), asyncHandler(authController.updateProfile));
router.put("/password", authenticate, validate({ body: changePasswordSchema }), asyncHandler(authController.changePassword));

export { router as authRouter };
