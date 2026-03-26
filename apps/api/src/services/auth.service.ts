import crypto from 'node:crypto';
import { prisma } from '@earth-revibe/db';
import { logger } from '../config/logger';
import { ApiError } from '../utils/api-error';
import { emailService } from './email.service';
import { getSupabaseAdmin, getSupabaseAnon } from '../config/supabase';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '@earth-revibe/shared';

// Helper: generate referral code from user ID
function generateReferralCode(userId: string): string {
  const prefix = 'REVIBE';
  const suffix = userId.slice(-6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export const authService = {
  /**
   * Register a new user via Supabase Auth, then create a Prisma User record
   * with referral processing.
   */
  async register(data: RegisterInput) {
    const supabase = getSupabaseAdmin();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // auto-confirm email
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      },
      app_metadata: {
        role: 'CUSTOMER',
      },
    });

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.status === 422) {
        throw ApiError.conflict('Email already registered');
      }
      logger.error({ err: authError }, 'Supabase createUser failed');
      throw ApiError.internal('Registration failed');
    }

    // 2. Create Prisma User record
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          passwordHash: 'supabase-managed',
          emailVerified: true,
          isActive: true,
        },
      });
    } catch (err: any) {
      // Rollback: delete the Supabase user if Prisma creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (err.code === 'P2002') {
        const target = err.meta?.target;
        if (Array.isArray(target) && target.includes('phone')) {
          throw ApiError.conflict('Phone number already registered');
        }
        throw ApiError.conflict('Email already registered');
      }
      throw err;
    }

    // 3. Generate referral code
    const referralCode = generateReferralCode(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode },
    });

    // 4. Process referral if code provided
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode },
      });
      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: user.id,
            status: 'SIGNED_UP',
          },
        });
      }
    }

    // 5. Sign in to get tokens
    const supabaseAnon = getSupabaseAnon();
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError || !signInData.session) {
      logger.error({ err: signInError }, 'Supabase signIn after register failed');
      throw ApiError.internal('Registration succeeded but sign-in failed');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        referralCode,
      },
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    };
  },

  /**
   * Login via Supabase Auth.
   */
  async login(data: LoginInput) {
    const supabaseAnon = getSupabaseAnon();
    const { data: signInData, error } = await supabaseAnon.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!signInData.session) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Auto-provision / sync Prisma user (same logic as middleware)
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: { lastLoginAt: new Date() },
      create: {
        email: data.email,
        passwordHash: 'supabase-managed',
        firstName: signInData.user.user_metadata?.first_name || data.email.split('@')[0],
        lastName: signInData.user.user_metadata?.last_name || '',
        emailVerified: true,
        isActive: true,
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        referralCode: true,
        isActive: true,
      },
    });

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        referralCode: user.referralCode,
      },
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    };
  },

  /**
   * Refresh session via Supabase.
   */
  async refreshToken(token: string) {
    const supabaseAnon = getSupabaseAnon();
    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token: token });

    if (error || !data.session) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  /**
   * Logout — revoke the Supabase session.
   */
  async logout(refreshToken: string) {
    // Supabase Admin can sign out users by ID, but we only have the refresh token.
    // Best effort: just let the token expire naturally.
    // If we had the Supabase user ID, we could use admin.signOut(userId).
    // For now, the client-side signOut() handles session cleanup.
    void refreshToken;
  },

  /**
   * Send a password reset email with a server-generated token.
   * Works on any device/browser — no Supabase PKCE or implicit flow dependency.
   */
  async forgotPassword(email: string) {
    // Don't reveal if email exists — always return success
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    // Check for Supabase auth user
    const supabase = getSupabaseAdmin();
    const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
    const supabaseUser = supabaseUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!supabaseUser) return;

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this email
    await prisma.passwordResetToken.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Store the token
    await prisma.passwordResetToken.create({
      data: { token, email, expiresAt },
    });

    // Send the email via SMTP
    await emailService.sendPasswordResetEmail(email, token);
  },

  /**
   * Reset password using a server-generated token.
   * Validates the DB token, then updates the password in Supabase via admin API.
   */
  async resetPassword(token: string, newPassword: string) {
    // Find and validate the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw ApiError.badRequest('Invalid reset link. Please request a new one.');
    }

    if (resetToken.usedAt) {
      throw ApiError.badRequest('This reset link has already been used.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw ApiError.badRequest('This reset link has expired. Please request a new one.');
    }

    // Find the Supabase user by email
    const supabase = getSupabaseAdmin();
    const { data: supabaseUsers } = await supabase.auth.admin.listUsers();
    const supabaseUser = supabaseUsers?.users?.find(
      (u) => u.email?.toLowerCase() === resetToken.email.toLowerCase()
    );

    if (!supabaseUser) {
      throw ApiError.badRequest('Account not found. Please contact support.');
    }

    // Update password in Supabase
    const { error } = await supabase.auth.admin.updateUserById(supabaseUser.id, {
      password: newPassword,
    });

    if (error) {
      logger.error({ err: error }, 'Supabase password update failed');
      throw ApiError.internal('Password reset failed. Please try again.');
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
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
   * Change password via Supabase Admin API.
   */
  async changePassword(userId: string, data: ChangePasswordInput) {
    // Find the user's email to look up their Supabase ID
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    // Verify current password by attempting sign-in
    const supabaseAnon = getSupabaseAnon();
    const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    });

    if (verifyError) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Find Supabase user by email and update password
    const supabase = getSupabaseAdmin();
    const { data: supabaseUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      logger.error({ err: listError }, 'Failed to list Supabase users');
      throw ApiError.internal('Password change failed');
    }

    const supabaseUser = supabaseUsers.users.find((u) => u.email === user.email);
    if (!supabaseUser) {
      throw ApiError.internal('User not found in auth provider');
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUser.id, {
      password: data.newPassword,
    });

    if (updateError) {
      logger.error({ err: updateError }, 'Supabase password update failed');
      throw ApiError.internal('Password change failed');
    }
  },
};
