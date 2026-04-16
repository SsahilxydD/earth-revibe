import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../utils/api-error';

// ---------------------------------------------------------------------------
// Hoisted mock handles -- must be declared before vi.mock() factory runs.
// ---------------------------------------------------------------------------
const { mockJwtVerify, mockFindUnique, mockGetAccessToken } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
  mockFindUnique: vi.fn(),
  mockGetAccessToken: vi.fn(),
}));

vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock('../../config/env', () => ({
  env: { JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars' },
}));

vi.mock('../../utils/cookies', () => ({
  getAccessTokenFromRequest: mockGetAccessToken,
}));

import { authenticate, optionalAuthenticate, authorize } from '../auth';

// ---------------------------------------------------------------------------
// Shared fixture factories
// ---------------------------------------------------------------------------
const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  phone: '+911234567890',
  firstName: 'Test',
  lastName: 'User',
  role: 'CUSTOMER',
  isActive: true,
  ...overrides,
});

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({ user: undefined, ...overrides }) as unknown as Request;

const makeRes = () => ({}) as Response;

const makeNext = () => vi.fn() as NextFunction;

// ---------------------------------------------------------------------------
// Helper: reset every mock before each test so tests are fully independent.
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// authenticate
// ===========================================================================
describe('authenticate', () => {
  it('sets req.user and calls next when token is valid', async () => {
    const user = makeUser();
    mockGetAccessToken.mockReturnValue('valid-token');
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } });
    mockFindUnique.mockResolvedValue(user);

    const req = makeReq();
    const next = makeNext();

    await authenticate(req, makeRes(), next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
    expect(mockJwtVerify).toHaveBeenCalledOnce();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: expect.objectContaining({ id: true, email: true, role: true, isActive: true }),
    });
  });

  it('throws unauthorized when no token is present', async () => {
    mockGetAccessToken.mockReturnValue(null);

    const req = makeReq();
    const next = makeNext();

    await expect(authenticate(req, makeRes(), next)).rejects.toThrow(ApiError);
    await expect(authenticate(req, makeRes(), next)).rejects.toThrow('No token provided');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws unauthorized when token is invalid or expired', async () => {
    mockGetAccessToken.mockReturnValue('bad-token');
    mockJwtVerify.mockRejectedValue(new Error('JWSInvalid'));

    const req = makeReq();
    const next = makeNext();

    await expect(authenticate(req, makeRes(), next)).rejects.toThrow(ApiError);
    await expect(authenticate(req, makeRes(), next)).rejects.toThrow('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws unauthorized when token is valid but user is inactive', async () => {
    const inactiveUser = makeUser({ isActive: false });
    mockGetAccessToken.mockReturnValue('valid-token');
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } });
    mockFindUnique.mockResolvedValue(inactiveUser);

    const req = makeReq();
    const next = makeNext();

    await expect(authenticate(req, makeRes(), next)).rejects.toThrow(ApiError);
    await expect(authenticate(req, makeRes(), next)).rejects.toThrow('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws unauthorized when token is valid but user is not found', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'nonexistent-id' } });
    mockFindUnique.mockResolvedValue(null);

    const req = makeReq();
    const next = makeNext();

    await expect(authenticate(req, makeRes(), next)).rejects.toThrow(ApiError);
    await expect(authenticate(req, makeRes(), next)).rejects.toThrow('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws unauthorized when JWT payload has no sub claim', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockJwtVerify.mockResolvedValue({ payload: {} });

    const req = makeReq();
    const next = makeNext();

    await expect(authenticate(req, makeRes(), next)).rejects.toThrow('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// optionalAuthenticate
// ===========================================================================
describe('optionalAuthenticate', () => {
  it('sets req.user and calls next when token is valid', async () => {
    const user = makeUser();
    mockGetAccessToken.mockReturnValue('valid-token');
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } });
    mockFindUnique.mockResolvedValue(user);

    const req = makeReq();
    const next = makeNext();

    await optionalAuthenticate(req, makeRes(), next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next without setting req.user when no token is present', async () => {
    mockGetAccessToken.mockReturnValue(null);

    const req = makeReq();
    const next = makeNext();

    await optionalAuthenticate(req, makeRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('calls next without req.user when token is invalid (no throw)', async () => {
    mockGetAccessToken.mockReturnValue('bad-token');
    mockJwtVerify.mockRejectedValue(new Error('JWSInvalid'));

    const req = makeReq();
    const next = makeNext();

    await optionalAuthenticate(req, makeRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next without req.user when user is inactive', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } });
    mockFindUnique.mockResolvedValue(makeUser({ isActive: false }));

    const req = makeReq();
    const next = makeNext();

    await optionalAuthenticate(req, makeRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// authorize
// ===========================================================================
describe('authorize', () => {
  it('calls next when user has a required role', () => {
    const req = makeReq({ user: makeUser({ role: 'ADMIN' }) });
    const next = makeNext();

    const middleware = authorize('ADMIN' as any, 'SUPER_ADMIN' as any);
    middleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('throws forbidden when user lacks the required role', () => {
    const req = makeReq({ user: makeUser({ role: 'CUSTOMER' }) });
    const next = makeNext();

    const middleware = authorize('ADMIN' as any, 'SUPER_ADMIN' as any);

    expect(() => middleware(req, makeRes(), next)).toThrow(ApiError);
    expect(() => middleware(req, makeRes(), next)).toThrow('Insufficient permissions');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws unauthorized when no user is on the request', () => {
    const req = makeReq({ user: undefined });
    const next = makeNext();

    const middleware = authorize('ADMIN' as any);

    expect(() => middleware(req, makeRes(), next)).toThrow(ApiError);
    expect(() => middleware(req, makeRes(), next)).toThrow('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  it('works with a single role', () => {
    const req = makeReq({ user: makeUser({ role: 'SUPPORT_STAFF' }) });
    const next = makeNext();

    const middleware = authorize('SUPPORT_STAFF' as any);
    middleware(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('throws correct ApiError status codes', () => {
    // 403 for role mismatch
    const req = makeReq({ user: makeUser({ role: 'CUSTOMER' }) });
    try {
      authorize('ADMIN' as any)(req, makeRes(), makeNext());
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(403);
      expect((err as ApiError).code).toBe('FORBIDDEN');
    }

    // 401 for missing user
    const reqNoUser = makeReq({ user: undefined });
    try {
      authorize('ADMIN' as any)(reqNoUser, makeRes(), makeNext());
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(401);
      expect((err as ApiError).code).toBe('UNAUTHORIZED');
    }
  });
});
