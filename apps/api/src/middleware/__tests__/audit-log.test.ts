import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { auditLog } from '../audit-log';

vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

import { logger } from '../../config/logger';

function createMockReq(
  method: string,
  body?: Record<string, unknown>,
  user?: { id: string }
): Request {
  return {
    method,
    originalUrl: '/api/v1/test',
    body: body || {},
    user,
    ip: '127.0.0.1',
    get: vi.fn().mockReturnValue('test-agent'),
  } as unknown as Request;
}

function createMockRes(): Response & { _finishCallbacks: (() => void)[] } {
  const res: any = {
    statusCode: 200,
    _finishCallbacks: [] as (() => void)[],
    on(event: string, cb: () => void) {
      if (event === 'finish') {
        res._finishCallbacks.push(cb);
      }
      return res;
    },
  };
  return res;
}

describe('auditLog middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip GET requests', () => {
    const req = createMockReq('GET');
    const res = createMockRes();
    const next = vi.fn();

    auditLog(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._finishCallbacks).toHaveLength(0);
  });

  it('should skip HEAD requests', () => {
    const req = createMockReq('HEAD');
    const res = createMockRes();
    const next = vi.fn();

    auditLog(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._finishCallbacks).toHaveLength(0);
  });

  it('should log POST requests after response finishes', () => {
    const req = createMockReq('POST', { email: 'test@test.com' }, { id: 'user-1' });
    const res = createMockRes();
    const next = vi.fn();

    auditLog(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._finishCallbacks).toHaveLength(1);

    // Simulate response finishing
    res._finishCallbacks[0]();

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: true,
        userId: 'user-1',
        method: 'POST',
        path: '/api/v1/test',
        statusCode: 200,
      }),
      expect.stringContaining('AUDIT POST')
    );
  });

  it('should log PUT, PATCH, and DELETE requests', () => {
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      vi.clearAllMocks();
      const req = createMockReq(method);
      const res = createMockRes();
      const next = vi.fn();

      auditLog(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res._finishCallbacks).toHaveLength(1);
    }
  });

  it('should redact sensitive fields from request body', () => {
    const req = createMockReq('POST', {
      email: 'user@test.com',
      password: 'secret123',
      token: 'jwt-token',
      razorpaySignature: 'sig-abc',
      name: 'John',
    });
    const res = createMockRes();
    const next = vi.fn();

    auditLog(req, res, next);
    res._finishCallbacks[0]();

    const logCall = vi.mocked(logger.info).mock.calls[0][0] as any;
    expect(logCall.body.password).toBe('[REDACTED]');
    expect(logCall.body.token).toBe('[REDACTED]');
    expect(logCall.body.razorpaySignature).toBe('[REDACTED]');
    expect(logCall.body.email).toBe('user@test.com');
    expect(logCall.body.name).toBe('John');
  });

  it("should use 'anonymous' when no user is authenticated", () => {
    const req = createMockReq('POST');
    const res = createMockRes();
    const next = vi.fn();

    auditLog(req, res, next);
    res._finishCallbacks[0]();

    const logCall = vi.mocked(logger.info).mock.calls[0][0] as any;
    expect(logCall.userId).toBe('anonymous');
  });
});
