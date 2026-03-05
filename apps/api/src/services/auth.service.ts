import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@earth-revibe/db";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import type { RegisterInput, LoginInput } from "@earth-revibe/shared";

// Helper: generate access + refresh token pair
function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId, role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );
  return { accessToken, refreshToken };
}

// Helper: generate referral code from user ID
function generateReferralCode(userId: string): string {
  const prefix = "REVIBE";
  const suffix = userId.slice(-6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export const authService = {
  async register(data: RegisterInput) {
    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw ApiError.conflict("Email already registered");

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        passwordHash,
      },
    });

    // Generate referral code
    const referralCode = generateReferralCode(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode },
    });

    // Process referral if code provided
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode },
      });
      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: user.id,
            status: "SIGNED_UP",
          },
        });
      }
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        referralCode,
      },
      ...tokens,
    };
  },

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw ApiError.unauthorized("Invalid email or password");

    if (!user.isActive) throw ApiError.forbidden("Account is deactivated");

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized("Invalid email or password");

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = generateTokens(user.id, user.role);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        referralCode: user.referralCode,
      },
      ...tokens,
    };
  },

  async refreshToken(token: string) {
    // Verify the refresh token JWT
    let decoded: { userId: string; role: string };
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as typeof decoded;
    } catch {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    // Check if token exists in DB
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw ApiError.unauthorized("Refresh token expired");
    }

    // Delete old token (rotation)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // Get user
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) throw ApiError.unauthorized("User not found");

    // Generate new tokens
    const tokens = generateTokens(user.id, user.role);

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Don't reveal if user exists
    if (!user) return;

    // Generate reset token (simple JWT with short expiry)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: "password-reset" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    // TODO: Send email with reset link containing resetToken
    // For now, log it in development
    if (env.NODE_ENV === "development") {
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }
  },

  async resetPassword(token: string, newPassword: string) {
    let decoded: { userId: string; purpose: string };
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as typeof decoded;
    } catch {
      throw ApiError.badRequest("Invalid or expired reset token");
    }

    if (decoded.purpose !== "password-reset") {
      throw ApiError.badRequest("Invalid token");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens for this user
    await prisma.refreshToken.deleteMany({ where: { userId: decoded.userId } });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        loyaltyPoints: true,
        referralCode: true,
        createdAt: true,
      },
    });

    if (!user) throw ApiError.notFound("User not found");
    return user;
  },
};
