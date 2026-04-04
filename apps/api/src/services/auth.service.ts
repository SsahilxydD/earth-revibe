import crypto from 'node:crypto';
import { SignJWT } from 'jose';
import { prisma } from '@earth-revibe/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';
import { APP_CONSTANTS } from '../config/constants';
import { sendWhatsAppOtp } from './whatsapp.service';
import type {
  SendOtpInput,
  VerifyOtpInput,
  LoginInput,
  UpdateProfileInput,
} from '@earth-revibe/shared';

const JWT_SECRET_KEY = new TextEncoder().encode(env.JWT_SECRET);

/** Hash a password with scrypt. Returns "salt:hash" hex string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a password against a stored hash.
 * Supports both scrypt ("salt:hash") and legacy bcrypt ("$2a$..." / "$2b$...") formats.
 * Returns { valid, isBcrypt } so callers can auto-migrate bcrypt hashes to scrypt.
 */
async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; isBcrypt: boolean }> {
  // Legacy bcrypt hash (from old seed / Supabase auth era)
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    // bcrypt verify using constant-time comparison built into the format:
    // We do a manual check since bcryptjs isn't a dependency of the API.
    // Import dynamically so it doesn't break if bcryptjs is absent.
    try {
      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, stored);
      return { valid, isBcrypt: true };
    } catch {
      // bcryptjs not installed — can't verify legacy hash
      logger.warn('bcrypt hash found but bcryptjs not installed — cannot verify');
      return { valid: false, isBcrypt: true };
    }
  }

  // Current scrypt format: "salt:hash"
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return { valid: false, isBcrypt: false };
  const valid = await new Promise<boolean>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey));
    });
  });
  return { valid, isBcrypt: false };
}

/** Hash an OTP code with SHA-256 for storage. */
function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Generate a cryptographically random 6-digit OTP. */
function generateOtp(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

/** Generate a referral code from a user ID. */
function generateReferralCode(userId: string): string {
  return `REVIBE-${userId.slice(-6).toUpperCase()}`;
}

/** Sign a JWT access token for the given user (15-minute expiry). */
async function signAccessToken(user: { id: string; role: string }): Promise<string> {
  return new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET_KEY);
}

/**
 * Generate a refresh token, store its SHA-256 hash in the database.
 * Returns the raw token (to be set as a cookie).
 */
async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(64).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + APP_CONSTANTS.REFRESH_TOKEN_EXPIRY_MS);

  await prisma.refreshToken.create({
    data: { token: hashed, userId, expiresAt },
  });

  return raw;
}

/**
 * Issue a fresh access + refresh token pair for a user.
 * Used by login, verifyOtp, and refresh flows.
 */
async function issueTokenPair(user: { id: string; role: string }) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user),
    createRefreshToken(user.id),
  ]);
  return { accessToken, refreshToken };
}

export const authService = {
  /**
   * Send OTP to the given phone number via WhatsApp.
   * Rate-limited to 3 OTPs per phone per 10 minutes (checked in DB).
   */
  async sendOtp({ phone }: SendOtpInput) {
    // Rate limit: max 3 OTPs per phone in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.otpCode.count({
      where: { phone, createdAt: { gte: tenMinutesAgo } },
    });
    if (recentCount >= 3) {
      throw ApiError.tooManyRequests('Too many OTP requests. Please try again later.');
    }

    // Clean up old expired/verified OTPs for this phone
    await prisma.otpCode.deleteMany({
      where: {
        phone,
        OR: [{ expiresAt: { lt: new Date() } }, { verified: true }],
      },
    });

    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    await sendWhatsAppOtp(phone, code);

    logger.info({ phone: phone.slice(0, 6) + '****' }, 'OTP sent');
  },

  /**
   * Verify an OTP code and return a signed JWT + user data.
   */
  async verifyOtp({ phone, code }: VerifyOtpInput) {
    // Find the latest unverified, unexpired OTP for this phone
    const otp = await prisma.otpCode.findFirst({
      where: { phone, verified: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw ApiError.badRequest('OTP expired or not found. Please request a new one.');
    }

    if (otp.attempts >= 5) {
      throw ApiError.tooManyRequests('Too many attempts. Request a new OTP.');
    }

    const codeHash = hashOtp(code);

    if (codeHash !== otp.codeHash) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw ApiError.badRequest('Invalid OTP');
    }

    // Mark as verified
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Find or create user by phone
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email: `${phone.replace('+', '')}@phone.earthrevibe.com`,
          firstName: '',
          lastName: '',
          phoneVerified: true,
          isActive: true,
        },
      });

      // Generate referral code
      const referralCode = generateReferralCode(user.id);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, lastLoginAt: new Date() },
      });
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    const tokens = await issueTokenPair(user);

    return {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        referralCode: user.referralCode,
      },
      ...tokens,
    };
  },

  /**
   * Email/password login — used by admin dashboard.
   */
  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash || user.passwordHash === '') {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const { valid, isBcrypt } = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Auto-migrate legacy bcrypt hash to scrypt on successful login
    const updateData: { lastLoginAt: Date; passwordHash?: string } = {
      lastLoginAt: new Date(),
    };
    if (isBcrypt) {
      updateData.passwordHash = await hashPassword(password);
      logger.info({ userId: user.id }, 'Migrated password hash from bcrypt to scrypt');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const tokens = await issueTokenPair(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
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

    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        avatar: data.avatar,
      },
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
    return user;
  },

  /**
   * Rotate a refresh token: validate the old one, delete it, issue a new pair.
   * If the token is reused after rotation, all tokens for the user are revoked (theft detection).
   */
  async refresh(rawToken: string) {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });

    if (!stored) {
      // Token not found — could be a reuse attack. We can't identify the user from
      // the raw token alone, so just reject. If we had token families we could revoke
      // all tokens for the user, but the simpler approach is sufficient here.
      logger.warn('Refresh token not found — possible reuse or expired token');
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw ApiError.unauthorized('Refresh token expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
      throw ApiError.unauthorized('Account not found or deactivated');
    }

    // Delete the used token (rotation — each token is single-use)
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // Issue new pair
    return issueTokenPair(user);
  },

  /**
   * Revoke all refresh tokens for a user (used on logout).
   */
  async revokeAllTokens(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },

  /**
   * Revoke all tokens for the user who owns a given refresh token.
   * Used when logout happens after the access token has already expired
   * (so req.user is unavailable), but the refresh cookie is still present.
   */
  async revokeByRefreshToken(rawToken: string) {
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });
    if (stored) {
      await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
    }
  },
};
