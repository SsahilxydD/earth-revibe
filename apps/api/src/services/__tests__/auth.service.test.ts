/**
 * auth.service.test.ts
 *
 * Unit tests for the Supabase-based auth service.
 * All external dependencies (Supabase Admin SDK, Supabase Anon SDK, Prisma, logger)
 * are fully mocked so these tests run without any live database or network.
 *
 * Pattern rules enforced:
 *  - vi.hoisted() for all mock variables
 *  - vi.resetAllMocks() in beforeEach (never clearAllMocks)
 *  - mockResolvedValueOnce to prevent mock leakage between tests
 *  - No shared mutable state between tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Hoist all mock objects before any import side-effects run
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // Supabase Admin — auth.admin.* + auth.getUser
  const mockAdminCreateUser = vi.fn();
  const mockAdminUpdateUserById = vi.fn();
  const mockAdminListUsers = vi.fn();
  const mockAdminGetUser = vi.fn();

  const mockSupabaseAdmin = {
    auth: {
      admin: {
        createUser: mockAdminCreateUser,
        updateUserById: mockAdminUpdateUserById,
        listUsers: mockAdminListUsers,
      },
      getUser: mockAdminGetUser,
    },
  };

  // Supabase Anon — auth.signInWithPassword, auth.refreshSession, auth.resetPasswordForEmail
  const mockAnonSignIn = vi.fn();
  const mockAnonRefreshSession = vi.fn();
  const mockAnonResetPasswordForEmail = vi.fn();

  const mockSupabaseAnon = {
    auth: {
      signInWithPassword: mockAnonSignIn,
      refreshSession: mockAnonRefreshSession,
      resetPasswordForEmail: mockAnonResetPasswordForEmail,
    },
  };

  // Prisma mocks
  const mockPrismaUserCreate = vi.fn();
  const mockPrismaUserUpdate = vi.fn();
  const mockPrismaUserFindUnique = vi.fn();
  const mockPrismaUserUpsert = vi.fn();
  const mockPrismaReferralCreate = vi.fn();

  const mockPrisma = {
    user: {
      create: mockPrismaUserCreate,
      update: mockPrismaUserUpdate,
      findUnique: mockPrismaUserFindUnique,
      upsert: mockPrismaUserUpsert,
    },
    referral: {
      create: mockPrismaReferralCreate,
    },
  };

  // Logger mock — suppress all output during tests
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    mockSupabaseAdmin,
    mockSupabaseAnon,
    mockAdminCreateUser,
    mockAdminUpdateUserById,
    mockAdminListUsers,
    mockAdminGetUser,
    mockAnonSignIn,
    mockAnonRefreshSession,
    mockAnonResetPasswordForEmail,
    mockPrisma,
    mockPrismaUserCreate,
    mockPrismaUserUpdate,
    mockPrismaUserFindUnique,
    mockPrismaUserUpsert,
    mockPrismaReferralCreate,
    mockLogger,
  };
});

// ---------------------------------------------------------------------------
// 2. Module mocks — must be declared before the service import
// ---------------------------------------------------------------------------
vi.mock('@earth-revibe/db', () => ({
  prisma: mocks.mockPrisma,
}));

vi.mock('../../config/supabase', () => ({
  getSupabaseAdmin: () => mocks.mockSupabaseAdmin,
  getSupabaseAnon: () => mocks.mockSupabaseAnon,
}));

vi.mock('../../config/env', () => ({
  env: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    FRONTEND_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}));

vi.mock('../../config/logger', () => ({
  logger: mocks.mockLogger,
}));

// ---------------------------------------------------------------------------
// 3. Import service under test AFTER mocks are registered
// ---------------------------------------------------------------------------
import { authService } from '../auth.service';
import { ApiError } from '../../utils/api-error';

// ---------------------------------------------------------------------------
// 4. Shared fixture factories (pure, no shared mutable state)
// ---------------------------------------------------------------------------
function makeSupabaseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'supa-uid-abc123',
    email: 'test@example.com',
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    access_token: 'access-token-xyz',
    refresh_token: 'refresh-token-xyz',
    ...overrides,
  };
}

function makePrismaUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prisma-user-id-abc',
    email: 'test@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    phone: '9876543210',
    avatar: null,
    role: 'CUSTOMER',
    referralCode: 'REVIBE-IDABC',
    isActive: true,
    loyaltyPoints: 0,
    createdAt: new Date('2025-01-01'),
    lastLoginAt: null,
    passwordHash: 'supabase-managed',
    emailVerified: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 5. Reset all mocks before every test to prevent leakage
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// register
// ===========================================================================
describe('authService.register', () => {
  it('creates Supabase user, Prisma user, generates referral code, returns tokens', async () => {
    const prismaUser = makePrismaUser({ id: 'user-abcdef', referralCode: null });
    const updatedUser = { ...prismaUser, referralCode: 'REVIBE-ABCDEF' };

    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    mocks.mockPrismaUserCreate.mockResolvedValueOnce(prismaUser);
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedUser);
    // No referral code in input — findUnique should NOT be called
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });

    const result = await authService.register({
      email: 'test@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '9876543210',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.firstName).toBe('Alice');
    expect(result.user.referralCode).toBe('REVIBE-ABCDEF');
    expect(result.accessToken).toBe('access-token-xyz');
    expect(result.refreshToken).toBe('refresh-token-xyz');

    expect(mocks.mockAdminCreateUser).toHaveBeenCalledOnce();
    expect(mocks.mockPrismaUserCreate).toHaveBeenCalledOnce();
    expect(mocks.mockPrismaUserUpdate).toHaveBeenCalledOnce();
    expect(mocks.mockPrismaReferralCreate).not.toHaveBeenCalled();
    expect(mocks.mockAnonSignIn).toHaveBeenCalledOnce();
  });

  it("throws conflict (409) when Supabase returns 'already been registered'", async () => {
    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'User already been registered', status: 422 },
    });

    await expect(
      authService.register({
        email: 'dup@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
        firstName: 'Alice',
        lastName: 'Smith',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Email already registered',
    });

    expect(mocks.mockPrismaUserCreate).not.toHaveBeenCalled();
  });

  it("throws conflict when Supabase returns status 422 without 'already registered' text", async () => {
    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'email rate limit exceeded', status: 422 },
    });

    await expect(
      authService.register({
        email: 'dup@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
        firstName: 'Alice',
        lastName: 'Smith',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws internal (500) on unexpected Supabase createUser error', async () => {
    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'service unavailable', status: 503 },
    });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
        firstName: 'Alice',
        lastName: 'Smith',
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'Registration failed',
    });

    expect(mocks.mockLogger.error).toHaveBeenCalledOnce();
  });

  it('creates a referral record when a valid referral code is provided', async () => {
    const referrer = makePrismaUser({ id: 'referrer-id', referralCode: 'REVIBE-REF001' });
    const newUser = makePrismaUser({ id: 'new-user-id', referralCode: null });
    const updatedNewUser = { ...newUser, referralCode: 'REVIBE-SER-ID' };

    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    mocks.mockPrismaUserCreate.mockResolvedValueOnce(newUser);
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedNewUser);
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(referrer); // referrer lookup
    mocks.mockPrismaReferralCreate.mockResolvedValueOnce({ id: 'referral-id' });
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });

    await authService.register({
      email: 'new@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      firstName: 'Bob',
      lastName: 'Jones',
      referralCode: 'REVIBE-REF001',
    });

    expect(mocks.mockPrismaUserFindUnique).toHaveBeenCalledWith({
      where: { referralCode: 'REVIBE-REF001' },
    });
    expect(mocks.mockPrismaReferralCreate).toHaveBeenCalledWith({
      data: {
        referrerId: 'referrer-id',
        refereeId: 'new-user-id',
        status: 'SIGNED_UP',
      },
    });
  });

  it('skips referral creation when referral code is not found in DB', async () => {
    const newUser = makePrismaUser({ id: 'new-user-id', referralCode: null });
    const updatedNewUser = { ...newUser, referralCode: 'REVIBE-SER-ID' };

    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    mocks.mockPrismaUserCreate.mockResolvedValueOnce(newUser);
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedNewUser);
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(null); // referrer not found
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });

    await authService.register({
      email: 'new@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      firstName: 'Bob',
      lastName: 'Jones',
      referralCode: 'REVIBE-INVALID',
    });

    expect(mocks.mockPrismaReferralCreate).not.toHaveBeenCalled();
  });

  it('throws internal error when post-register sign-in fails', async () => {
    const prismaUser = makePrismaUser({ id: 'user-abcdef' });
    const updatedUser = { ...prismaUser, referralCode: 'REVIBE-ABCDEF' };

    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    mocks.mockPrismaUserCreate.mockResolvedValueOnce(prismaUser);
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedUser);
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'invalid credentials' },
    });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
        firstName: 'Alice',
        lastName: 'Smith',
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'Registration succeeded but sign-in failed',
    });
  });

  it('throws internal error when post-register sign-in returns no session', async () => {
    const prismaUser = makePrismaUser({ id: 'user-abcdef' });
    const updatedUser = { ...prismaUser, referralCode: 'REVIBE-ABCDEF' };

    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    mocks.mockPrismaUserCreate.mockResolvedValueOnce(prismaUser);
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedUser);
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: null },
      error: null,
    });

    await expect(
      authService.register({
        email: 'test@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
        firstName: 'Alice',
        lastName: 'Smith',
      })
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

// ===========================================================================
// login
// ===========================================================================
describe('authService.login', () => {
  it('returns user and tokens for valid credentials', async () => {
    const prismaUser = makePrismaUser({ isActive: true });

    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: {
        user: makeSupabaseUser({ user_metadata: { first_name: 'Alice', last_name: 'Smith' } }),
        session: makeSession(),
      },
      error: null,
    });
    mocks.mockPrismaUserUpsert.mockResolvedValueOnce(prismaUser);

    const result = await authService.login({
      email: 'test@example.com',
      password: 'Password1',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.firstName).toBe('Alice');
    expect(result.accessToken).toBe('access-token-xyz');
    expect(result.refreshToken).toBe('refresh-token-xyz');
    expect(mocks.mockPrismaUserUpsert).toHaveBeenCalledOnce();
  });

  it('throws unauthorized (401) when Supabase signIn returns an error', async () => {
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(
      authService.login({ email: 'wrong@example.com', password: 'bad' })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(mocks.mockPrismaUserUpsert).not.toHaveBeenCalled();
  });

  it('throws unauthorized (401) when signIn succeeds but session is null', async () => {
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: null },
      error: null,
    });

    await expect(
      authService.login({ email: 'test@example.com', password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws forbidden (403) when Prisma user isActive is false', async () => {
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });
    mocks.mockPrismaUserUpsert.mockResolvedValueOnce(makePrismaUser({ isActive: false }));

    await expect(
      authService.login({ email: 'test@example.com', password: 'Password1' })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Account is deactivated',
    });
  });

  it('upserts Prisma user with firstName derived from email when metadata is absent', async () => {
    const emailWithoutName = 'noname@example.com';
    const prismaUser = makePrismaUser({
      email: emailWithoutName,
      firstName: 'noname',
      isActive: true,
    });

    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: {
        user: makeSupabaseUser({ email: emailWithoutName, user_metadata: {} }),
        session: makeSession(),
      },
      error: null,
    });
    mocks.mockPrismaUserUpsert.mockResolvedValueOnce(prismaUser);

    const result = await authService.login({ email: emailWithoutName, password: 'Password1' });

    const upsertCall = mocks.mockPrismaUserUpsert.mock.calls[0][0];
    expect(upsertCall.create.firstName).toBe('noname');
    expect(result.user.email).toBe(emailWithoutName);
  });
});

// ===========================================================================
// refreshToken
// ===========================================================================
describe('authService.refreshToken', () => {
  it('returns new access and refresh tokens on valid refresh token', async () => {
    mocks.mockAnonRefreshSession.mockResolvedValueOnce({
      data: {
        session: makeSession({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        }),
      },
      error: null,
    });

    const result = await authService.refreshToken('old-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(mocks.mockAnonRefreshSession).toHaveBeenCalledWith({
      refresh_token: 'old-refresh-token',
    });
  });

  it('throws unauthorized (401) when Supabase returns an error', async () => {
    mocks.mockAnonRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Token expired' },
    });

    await expect(authService.refreshToken('expired-token')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired refresh token',
    });
  });

  it('throws unauthorized (401) when session is null but no error returned', async () => {
    mocks.mockAnonRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(authService.refreshToken('some-token')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws unauthorized (401) when passed an empty string token', async () => {
    mocks.mockAnonRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'invalid token' },
    });

    await expect(authService.refreshToken('')).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ===========================================================================
// logout
// ===========================================================================
describe('authService.logout', () => {
  it('resolves without throwing regardless of token value', async () => {
    await expect(authService.logout('any-refresh-token')).resolves.toBeUndefined();
  });

  it('resolves without throwing when passed empty string', async () => {
    await expect(authService.logout('')).resolves.toBeUndefined();
  });

  it('does not call any Supabase or Prisma methods', async () => {
    await authService.logout('some-token');

    expect(mocks.mockAnonSignIn).not.toHaveBeenCalled();
    expect(mocks.mockAdminCreateUser).not.toHaveBeenCalled();
    expect(mocks.mockPrismaUserCreate).not.toHaveBeenCalled();
    expect(mocks.mockPrismaUserUpdate).not.toHaveBeenCalled();
    expect(mocks.mockPrismaUserUpsert).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// forgotPassword
// ===========================================================================
describe('authService.forgotPassword', () => {
  it('calls resetPasswordForEmail with correct redirect URL', async () => {
    mocks.mockAnonResetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });

    await authService.forgotPassword('user@example.com');

    expect(mocks.mockAnonResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'http://localhost:3000/reset-password',
    });
  });

  it('resolves (does not throw) even when Supabase returns an error — to avoid email enumeration', async () => {
    mocks.mockAnonResetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { message: 'User not found' },
    });

    await expect(authService.forgotPassword('ghost@example.com')).resolves.toBeUndefined();
    expect(mocks.mockLogger.error).toHaveBeenCalledOnce();
  });

  it('resolves for an empty email string without crashing', async () => {
    mocks.mockAnonResetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });

    await expect(authService.forgotPassword('')).resolves.toBeUndefined();
  });
});

// ===========================================================================
// resetPassword
// ===========================================================================
describe('authService.resetPassword', () => {
  it('updates the Supabase user password when token is valid', async () => {
    const supaUser = makeSupabaseUser({ id: 'supa-uid-reset' });

    mocks.mockAdminGetUser.mockResolvedValueOnce({
      data: { user: supaUser },
      error: null,
    });
    mocks.mockAdminUpdateUserById.mockResolvedValueOnce({ data: {}, error: null });

    await authService.resetPassword('valid-access-token', 'NewPass123!');

    expect(mocks.mockAdminGetUser).toHaveBeenCalledWith('valid-access-token');
    expect(mocks.mockAdminUpdateUserById).toHaveBeenCalledWith('supa-uid-reset', {
      password: 'NewPass123!',
    });
  });

  it('throws bad request (400) when getUser returns an error', async () => {
    mocks.mockAdminGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    await expect(authService.resetPassword('expired-token', 'NewPass123!')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired reset token',
    });

    expect(mocks.mockAdminUpdateUserById).not.toHaveBeenCalled();
  });

  it('throws bad request (400) when getUser returns null user without error', async () => {
    mocks.mockAdminGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    await expect(authService.resetPassword('bad-token', 'NewPass123!')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws internal (500) when updateUserById fails', async () => {
    mocks.mockAdminGetUser.mockResolvedValueOnce({
      data: { user: makeSupabaseUser({ id: 'supa-uid-reset' }) },
      error: null,
    });
    mocks.mockAdminUpdateUserById.mockResolvedValueOnce({
      data: null,
      error: { message: 'update failed' },
    });

    await expect(authService.resetPassword('valid-token', 'NewPass123!')).rejects.toMatchObject({
      statusCode: 500,
      message: 'Password reset failed',
    });

    expect(mocks.mockLogger.error).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// getMe
// ===========================================================================
describe('authService.getMe', () => {
  it('returns user record when found', async () => {
    const user = makePrismaUser();
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(user);

    const result = await authService.getMe('prisma-user-id-abc');

    expect(result.id).toBe('prisma-user-id-abc');
    expect(result.email).toBe('test@example.com');
    expect(mocks.mockPrismaUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'prisma-user-id-abc' },
      select: expect.objectContaining({
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        referralCode: true,
      }),
    });
  });

  it('throws not found (404) when user does not exist in Prisma', async () => {
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(null);

    await expect(authService.getMe('nonexistent-id')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it('includes all required profile fields in the select', async () => {
    const user = makePrismaUser({
      phone: '9999999999',
      avatar: 'https://cdn.example.com/avatar.png',
      loyaltyPoints: 150,
    });
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(user);

    const result = await authService.getMe('user-id');

    expect(result.phone).toBe('9999999999');
    expect(result.avatar).toBe('https://cdn.example.com/avatar.png');
    expect(result.loyaltyPoints).toBe(150);
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});

// ===========================================================================
// updateProfile
// ===========================================================================
describe('authService.updateProfile', () => {
  it('updates and returns the updated user', async () => {
    const updatedUser = makePrismaUser({
      firstName: 'Updated',
      lastName: 'Name',
      phone: '1111111111',
      avatar: 'https://cdn.example.com/new-avatar.png',
    });
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedUser);

    const result = await authService.updateProfile('user-id', {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '1111111111',
      avatar: 'https://cdn.example.com/new-avatar.png',
    });

    expect(result.firstName).toBe('Updated');
    expect(result.lastName).toBe('Name');
    expect(result.phone).toBe('1111111111');
    expect(result.avatar).toBe('https://cdn.example.com/new-avatar.png');

    expect(mocks.mockPrismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: expect.objectContaining({
        firstName: 'Updated',
        lastName: 'Name',
        phone: '1111111111',
        avatar: 'https://cdn.example.com/new-avatar.png',
      }),
      select: expect.objectContaining({ id: true, email: true }),
    });
  });

  it('passes undefined fields through to Prisma (partial update)', async () => {
    const updatedUser = makePrismaUser({ firstName: 'Partial' });
    mocks.mockPrismaUserUpdate.mockResolvedValueOnce(updatedUser);

    const result = await authService.updateProfile('user-id', { firstName: 'Partial' });

    expect(result.firstName).toBe('Partial');
    const updateCall = mocks.mockPrismaUserUpdate.mock.calls[0][0];
    expect(updateCall.data.firstName).toBe('Partial');
  });

  it('propagates Prisma errors (e.g. record not found) to the caller', async () => {
    const prismaError = Object.assign(new Error('Record to update not found'), {
      code: 'P2025',
    });
    mocks.mockPrismaUserUpdate.mockRejectedValueOnce(prismaError);

    await expect(
      authService.updateProfile('ghost-user-id', { firstName: 'Ghost' })
    ).rejects.toThrow('Record to update not found');
  });
});

// ===========================================================================
// changePassword
// ===========================================================================
describe('authService.changePassword', () => {
  it('verifies current password and updates via Supabase admin on success', async () => {
    const prismaUser = makePrismaUser({ id: 'user-id', email: 'test@example.com' });
    const supaUser = makeSupabaseUser({ id: 'supa-uid-change', email: 'test@example.com' });

    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(prismaUser);
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: supaUser, session: makeSession() },
      error: null,
    });
    mocks.mockAdminListUsers.mockResolvedValueOnce({
      data: { users: [supaUser] },
      error: null,
    });
    mocks.mockAdminUpdateUserById.mockResolvedValueOnce({ data: {}, error: null });

    await authService.changePassword('user-id', {
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPass123!',
      confirmNewPassword: 'NewPass123!',
    });

    expect(mocks.mockAnonSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'CurrentPass1',
    });
    expect(mocks.mockAdminUpdateUserById).toHaveBeenCalledWith('supa-uid-change', {
      password: 'NewPass123!',
    });
  });

  it('throws not found (404) when user does not exist in Prisma', async () => {
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(null);

    await expect(
      authService.changePassword('ghost-id', {
        currentPassword: 'OldPass1',
        newPassword: 'NewPass123!',
        confirmNewPassword: 'NewPass123!',
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });

    expect(mocks.mockAnonSignIn).not.toHaveBeenCalled();
  });

  it('throws bad request (400) when current password is wrong', async () => {
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(
      makePrismaUser({ id: 'user-id', email: 'test@example.com' })
    );
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(
      authService.changePassword('user-id', {
        currentPassword: 'WrongPass1',
        newPassword: 'NewPass123!',
        confirmNewPassword: 'NewPass123!',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Current password is incorrect',
    });

    expect(mocks.mockAdminListUsers).not.toHaveBeenCalled();
    expect(mocks.mockAdminUpdateUserById).not.toHaveBeenCalled();
  });

  it('throws internal (500) when listUsers returns an error', async () => {
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(
      makePrismaUser({ id: 'user-id', email: 'test@example.com' })
    );
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });
    mocks.mockAdminListUsers.mockResolvedValueOnce({
      data: null,
      error: { message: 'service unavailable' },
    });

    await expect(
      authService.changePassword('user-id', {
        currentPassword: 'CurrentPass1',
        newPassword: 'NewPass123!',
        confirmNewPassword: 'NewPass123!',
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'Password change failed',
    });

    expect(mocks.mockLogger.error).toHaveBeenCalledOnce();
    expect(mocks.mockAdminUpdateUserById).not.toHaveBeenCalled();
  });

  it('throws internal (500) when Supabase user matching email is not found in listUsers', async () => {
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(
      makePrismaUser({ id: 'user-id', email: 'test@example.com' })
    );
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });
    mocks.mockAdminListUsers.mockResolvedValueOnce({
      data: {
        users: [makeSupabaseUser({ id: 'other-supa-id', email: 'different@example.com' })],
      },
      error: null,
    });

    await expect(
      authService.changePassword('user-id', {
        currentPassword: 'CurrentPass1',
        newPassword: 'NewPass123!',
        confirmNewPassword: 'NewPass123!',
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'User not found in auth provider',
    });

    expect(mocks.mockAdminUpdateUserById).not.toHaveBeenCalled();
  });

  it('throws internal (500) when updateUserById fails during password change', async () => {
    const prismaUser = makePrismaUser({ id: 'user-id', email: 'test@example.com' });
    const supaUser = makeSupabaseUser({ id: 'supa-uid-change', email: 'test@example.com' });

    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(prismaUser);
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: supaUser, session: makeSession() },
      error: null,
    });
    mocks.mockAdminListUsers.mockResolvedValueOnce({
      data: { users: [supaUser] },
      error: null,
    });
    mocks.mockAdminUpdateUserById.mockResolvedValueOnce({
      data: null,
      error: { message: 'update failed' },
    });

    await expect(
      authService.changePassword('user-id', {
        currentPassword: 'CurrentPass1',
        newPassword: 'NewPass123!',
        confirmNewPassword: 'NewPass123!',
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      message: 'Password change failed',
    });

    expect(mocks.mockLogger.error).toHaveBeenCalledOnce();
  });

  it('handles multiple Supabase users in listUsers and matches by email', async () => {
    const prismaUser = makePrismaUser({ id: 'user-id', email: 'target@example.com' });
    const targetSupaUser = makeSupabaseUser({ id: 'target-supa-id', email: 'target@example.com' });
    const otherSupaUser = makeSupabaseUser({ id: 'other-supa-id', email: 'other@example.com' });

    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(prismaUser);
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: targetSupaUser, session: makeSession() },
      error: null,
    });
    mocks.mockAdminListUsers.mockResolvedValueOnce({
      data: { users: [otherSupaUser, targetSupaUser] },
      error: null,
    });
    mocks.mockAdminUpdateUserById.mockResolvedValueOnce({ data: {}, error: null });

    await authService.changePassword('user-id', {
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPass123!',
      confirmNewPassword: 'NewPass123!',
    });

    expect(mocks.mockAdminUpdateUserById).toHaveBeenCalledWith('target-supa-id', {
      password: 'NewPass123!',
    });
  });
});

// ===========================================================================
// Edge cases: ApiError instance checks
// ===========================================================================
describe('ApiError type assertions', () => {
  it('register conflict is an ApiError instance', async () => {
    mocks.mockAdminCreateUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'already been registered', status: 422 },
    });

    let caught: unknown;
    try {
      await authService.register({
        email: 'dup@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
        firstName: 'Alice',
        lastName: 'Smith',
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('CONFLICT');
    expect((caught as ApiError).statusCode).toBe(409);
  });

  it('login unauthorized is an ApiError instance', async () => {
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'bad credentials' },
    });

    let caught: unknown;
    try {
      await authService.login({ email: 'x@x.com', password: 'bad' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('UNAUTHORIZED');
    expect((caught as ApiError).statusCode).toBe(401);
  });

  it('login forbidden is an ApiError instance', async () => {
    mocks.mockAnonSignIn.mockResolvedValueOnce({
      data: { user: makeSupabaseUser(), session: makeSession() },
      error: null,
    });
    mocks.mockPrismaUserUpsert.mockResolvedValueOnce(makePrismaUser({ isActive: false }));

    let caught: unknown;
    try {
      await authService.login({ email: 'test@example.com', password: 'pass' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('FORBIDDEN');
    expect((caught as ApiError).statusCode).toBe(403);
  });

  it('getMe not found is an ApiError instance', async () => {
    mocks.mockPrismaUserFindUnique.mockResolvedValueOnce(null);

    let caught: unknown;
    try {
      await authService.getMe('ghost-id');
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('NOT_FOUND');
    expect((caught as ApiError).statusCode).toBe(404);
  });
});
