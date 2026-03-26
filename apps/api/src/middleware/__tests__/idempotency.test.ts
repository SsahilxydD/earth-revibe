import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { idempotency } from '../idempotency';

// Mock @earth-revibe/db
vi.mock('@earth-revibe/db', () => ({
  prisma: {
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
  Prisma: {
    JsonNull: null,
  },
}));

// Mock logger
vi.mock('../../config/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { prisma } from '@earth-revibe/db';

function createMockReq(headers: Record<string, string> = {}, user?: { id: string }): Request {
  return {
    headers,
    user,
  } as unknown as Request;
}

function createMockRes(): Response & { _jsonBody?: unknown; _statusCode?: number } {
  const res: any = {
    statusCode: 200,
    status(code: number) {
      res.statusCode = code;
      res._statusCode = code;
      return res;
    },
    json(body: unknown) {
      res._jsonBody = body;
      return res;
    },
  };
  return res;
}

describe('idempotency middleware', () => {
  const endpoint = 'test/endpoint';
  let middleware: ReturnType<typeof idempotency>;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = idempotency(endpoint);
  });

  it('should call next() when no X-Idempotency-Key header is provided', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
  });

  it('should call next() when header is not a string', async () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should return cached response when key exists with COMPLETED status', async () => {
    const cachedBody = { success: true, data: { orderId: '123' } };
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValue({
      id: 'key-1',
      key: 'test-key',
      userId: 'user-1',
      status: 'COMPLETED',
      endpoint,
      response: { statusCode: 200, body: cachedBody },
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      createdAt: new Date(),
    });

    const req = createMockReq({ 'x-idempotency-key': 'test-key' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(200);
    expect(res._jsonBody).toEqual(cachedBody);
  });

  it('should return 409 when key is currently PROCESSING', async () => {
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValue({
      id: 'key-1',
      key: 'test-key',
      userId: 'user-1',
      status: 'PROCESSING',
      endpoint,
      response: null,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    });

    const req = createMockReq({ 'x-idempotency-key': 'test-key' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._statusCode).toBe(409);
    expect((res._jsonBody as any).success).toBe(false);
    expect((res._jsonBody as any).error.code).toBe('CONFLICT');
  });

  it('should delete expired key and allow retry', async () => {
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValue({
      id: 'key-1',
      key: 'test-key',
      userId: 'user-1',
      status: 'COMPLETED',
      endpoint,
      response: { statusCode: 200, body: {} },
      expiresAt: new Date(Date.now() - 1000), // expired
      createdAt: new Date(),
    });
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValue({
      id: 'key-2',
      key: 'test-key',
      userId: 'user-1',
      status: 'PROCESSING',
      endpoint,
      response: null,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    const req = createMockReq({ 'x-idempotency-key': 'test-key' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(prisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
    expect(next).toHaveBeenCalledOnce();
  });

  it('should allow retry when key has FAILED status', async () => {
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValue({
      id: 'key-1',
      key: 'test-key',
      userId: 'user-1',
      status: 'FAILED',
      endpoint,
      response: null,
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    });
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValue({
      id: 'key-1',
      key: 'test-key',
      userId: 'user-1',
      status: 'PROCESSING',
      endpoint,
      response: null,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    const req = createMockReq({ 'x-idempotency-key': 'test-key' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('should create PROCESSING record for new key and intercept response', async () => {
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValue({
      id: 'key-new',
      key: 'new-key',
      userId: 'user-1',
      status: 'PROCESSING',
      endpoint,
      response: null,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });
    vi.mocked(prisma.idempotencyKey.update).mockResolvedValue({} as any);

    const req = createMockReq({ 'x-idempotency-key': 'new-key' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(prisma.idempotencyKey.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'new-key' },
        create: expect.objectContaining({ status: 'PROCESSING' }),
      })
    );

    // Simulate the handler calling res.json
    res.json({ success: true, data: { id: 'order-1' } });

    // The update should have been called to store the response
    expect(prisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-new' },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      })
    );
  });

  it('should proceed without protection when DB query fails', async () => {
    vi.mocked(prisma.idempotencyKey.findUnique).mockRejectedValue(new Error('DB connection lost'));

    const req = createMockReq({ 'x-idempotency-key': 'test-key' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should use 'anonymous' as userId when no user is authenticated", async () => {
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValue({
      id: 'key-new',
      key: 'anon-key',
      userId: 'anonymous',
      status: 'PROCESSING',
      endpoint,
      response: null,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });

    const req = createMockReq({ 'x-idempotency-key': 'anon-key' });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(prisma.idempotencyKey.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: 'anonymous' }),
      })
    );
  });
});
