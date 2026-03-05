import { Router, type IRouter } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "@earth-revibe/shared";

const router: IRouter = Router();

router.post("/register", validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", validate({ body: loginSchema }), asyncHandler(authController.login));
router.post("/refresh", validate({ body: refreshTokenSchema }), asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.post("/forgot-password", validate({ body: forgotPasswordSchema }), asyncHandler(authController.forgotPassword));
router.post("/reset-password", validate({ body: resetPasswordSchema }), asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.getMe));

export { router as authRouter };
