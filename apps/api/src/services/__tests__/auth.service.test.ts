import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { ApiError } from '../../utils/api-error';

// ---------------------------------------------------------------------------
// Hoisted mock handles — must be declared before vi.mock() factory runs.
// ---------------------------------------------------------------------------
const { mockUser, mockOtpCode, mockRefreshToken } = vi.hoisted(() => ({
  mockUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockOtpCode: {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  mockRefreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    user: mockUser,
    otpCode: mockOtpCode,
    refreshToken: mockRefreshToken,
  },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-at-least-32-chars-long',
  },
}));

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../whatsapp.service', () => ({
  sendWhatsAppOtp: vi.fn().mockResolvedValue(undefined),
}));

import { hashPassword, authService } from '../auth.service';

// ---------------------------------------------------------------------------
// Shared fixture factories
// ---------------------------------------------------------------------------
const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'admin@earthrevibe.com',
  phone: '+919876543210',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  passwordHash: null as string | null,
  isActive: true,
  avatar: null,
  loyaltyPoints: 0,
  referralCode: 'REVIBE-USER01',
  phoneVerified: true,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

const USER_ID = 'user-1';

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// hashPassword
// ===========================================================================
describe('hashPassword', () => {
  it('returns a string in "salt:hash" format', async () => {
    const result = await hashPassword('mypassword');
    const parts = result.split(':');
    expect(parts).toHaveLength(2);
    // salt is 16 random bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // scrypt output is 64 bytes = 128 hex chars
    expect(parts[1]).toHaveLength(128);
  });

  it('produces different salts each time', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    const salt1 = hash1.split(':')[0];
    const salt2 = hash2.split(':')[0];
    expect(salt1).not.toBe(salt2);
  });

  it('produces different hashes for different passwords', async () => {
    const hash1 = await hashPassword('password-a');
    const hash2 = await hashPassword('password-b');
    expect(hash1).not.toBe(hash2);
  });
});

// ===========================================================================
// authService.login
// ===========================================================================
describe('authService.login', () => {
  it('returns user and tokens on successful login', async () => {
    const storedHash = await hashPassword('correct-password');
    const user = makeUser({ passwordHash: storedHash });
    mockUser.findUnique.mockResolvedValue(user);
    mockUser.update.mockResolvedValue(user);
    mockRefreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const result = await authService.login({
      email: 'admin@earthrevibe.com',
      password: 'correct-password',
    });

    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('admin@earthrevibe.com');
    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    // Should update lastLoginAt
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      })
    );
  });

  it('throws unauthorized when password is wrong', async () => {
    const storedHash = await hashPassword('correct-password');
    const user = makeUser({ passwordHash: storedHash });
    mockUser.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({
        email: 'admin@earthrevibe.com',
        password: 'wrong-password',
      })
    ).rejects.toThrow(ApiError);

    await expect(
      authService.login({
        email: 'admin@earthrevibe.com',
        password: 'wrong-password',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws unauthorized when user has no passwordHash', async () => {
    const user = makeUser({ passwordHash: null });
    mockUser.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({
        email: 'admin@earthrevibe.com',
        password: 'any-password',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws unauthorized when user has empty string passwordHash', async () => {
    const user = makeUser({ passwordHash: '' });
    mockUser.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({
        email: 'admin@earthrevibe.com',
        password: 'any-password',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws unauthorized when user does not exist', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nobody@example.com',
        password: 'any-password',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  it('throws forbidden when user is inactive', async () => {
    const storedHash = await hashPassword('correct-password');
    const user = makeUser({ passwordHash: storedHash, isActive: false });
    mockUser.findUnique.mockResolvedValue(user);

    await expect(
      authService.login({
        email: 'admin@earthrevibe.com',
        password: 'correct-password',
      })
    ).rejects.toThrow('Account is deactivated');
  });

  it('migrates bcrypt hash to scrypt on successful login', async () => {
    // bcrypt hash for "bcrypt-password" — we mock bcryptjs to return true
    const bcryptHash = '$2b$12$fakebcrypthashforTesting1234567890abcdefghij';
    const user = makeUser({ passwordHash: bcryptHash });
    mockUser.findUnique.mockResolvedValue(user);
    mockUser.update.mockResolvedValue(user);
    mockRefreshToken.create.mockResolvedValue({ id: 'rt-1' });

    // Mock bcryptjs dynamic import to accept the password
    vi.doMock('bcryptjs', () => ({
      compare: vi.fn().mockResolvedValue(true),
    }));

    const result = await authService.login({
      email: 'admin@earthrevibe.com',
      password: 'bcrypt-password',
    });

    expect(result.user.id).toBe('user-1');
    // The update call should include a new scrypt passwordHash
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          passwordHash: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]{128}$/),
          lastLoginAt: expect.any(Date),
        }),
      })
    );
  });
});

// ===========================================================================
// authService.changePassword
// ===========================================================================
describe('authService.changePassword', () => {
  it('changes password when current password is correct', async () => {
    const storedHash = await hashPassword('old-password');
    mockUser.findUnique.mockResolvedValue({ passwordHash: storedHash });
    mockUser.update.mockResolvedValue({});

    await authService.changePassword(USER_ID, {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });

    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: {
          passwordHash: expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]{128}$/),
        },
      })
    );
  });

  it('throws when current password is wrong', async () => {
    const storedHash = await hashPassword('old-password');
    mockUser.findUnique.mockResolvedValue({ passwordHash: storedHash });

    await expect(
      authService.changePassword(USER_ID, {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      })
    ).rejects.toThrow('Current password is incorrect');
  });

  it('throws when user has no passwordHash', async () => {
    mockUser.findUnique.mockResolvedValue({ passwordHash: null });

    await expect(
      authService.changePassword(USER_ID, {
        currentPassword: 'any',
        newPassword: 'new-password',
      })
    ).rejects.toThrow('Password login is not enabled for this account');
  });

  it('throws when user is not found', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(
      authService.changePassword(USER_ID, {
        currentPassword: 'any',
        newPassword: 'new-password',
      })
    ).rejects.toThrow('Password login is not enabled for this account');
  });
});

// ===========================================================================
// authService.refresh
// ===========================================================================
describe('authService.refresh', () => {
  it('rotates token: deletes old, issues new pair', async () => {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = {
      id: 'rt-1',
      token: hashed,
      userId: USER_ID,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
    const user = makeUser();

    mockRefreshToken.findUnique.mockResolvedValue(stored);
    mockUser.findUnique.mockResolvedValue(user);
    mockRefreshToken.delete.mockResolvedValue(stored);
    mockRefreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const result = await authService.refresh(rawToken);

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
    // Old token deleted
    expect(mockRefreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    // New token created
    expect(mockRefreshToken.create).toHaveBeenCalledOnce();
  });

  it('throws when token is expired and deletes it', async () => {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = {
      id: 'rt-1',
      token: hashed,
      userId: USER_ID,
      expiresAt: new Date(Date.now() - 1000), // expired
    };

    mockRefreshToken.findUnique.mockResolvedValue(stored);

    await expect(authService.refresh(rawToken)).rejects.toThrow('Refresh token expired');
    // Expired token cleaned up
    expect(mockRefreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
  });

  it('throws when token is not found (reuse or invalid)', async () => {
    mockRefreshToken.findUnique.mockResolvedValue(null);

    await expect(authService.refresh('nonexistent-raw-token')).rejects.toThrow(
      'Invalid refresh token'
    );
  });

  it('throws and revokes all tokens when user is inactive', async () => {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = {
      id: 'rt-1',
      token: hashed,
      userId: USER_ID,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    mockRefreshToken.findUnique.mockResolvedValue(stored);
    mockUser.findUnique.mockResolvedValue(makeUser({ isActive: false }));
    mockRefreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await expect(authService.refresh(rawToken)).rejects.toThrow('Account not found or deactivated');
    // All tokens for the user should be revoked
    expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it('throws and revokes all tokens when user is not found', async () => {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = {
      id: 'rt-1',
      token: hashed,
      userId: USER_ID,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    mockRefreshToken.findUnique.mockResolvedValue(stored);
    mockUser.findUnique.mockResolvedValue(null);
    mockRefreshToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(authService.refresh(rawToken)).rejects.toThrow('Account not found or deactivated');
    expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });
});

// ===========================================================================
// authService.revokeAllTokens
// ===========================================================================
describe('authService.revokeAllTokens', () => {
  it('calls prisma.refreshToken.deleteMany with the userId', async () => {
    mockRefreshToken.deleteMany.mockResolvedValue({ count: 3 });

    await authService.revokeAllTokens(USER_ID);

    expect(mockRefreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    expect(mockRefreshToken.deleteMany).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// authService.getMe
// ===========================================================================
describe('authService.getMe', () => {
  it('returns user profile when user exists', async () => {
    const user = {
      id: USER_ID,
      email: 'admin@earthrevibe.com',
      phone: '+919876543210',
      firstName: 'Test',
      lastName: 'User',
      avatar: null,
      role: 'ADMIN',
      loyaltyPoints: 0,
      referralCode: 'REVIBE-USER01',
      createdAt: new Date('2026-01-01'),
    };
    mockUser.findUnique.mockResolvedValue(user);

    const result = await authService.getMe(USER_ID);

    expect(result).toEqual(user);
    expect(mockUser.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
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
  });

  it('throws not found when user does not exist', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(authService.getMe('nonexistent-id')).rejects.toThrow('User not found');
  });
});
