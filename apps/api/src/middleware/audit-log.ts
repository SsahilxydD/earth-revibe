import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/** Fields that should never appear in audit logs */
const REDACTED_FIELDS = new Set([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'accessToken',
  'razorpaySignature',
  'razorpayKeySecret',
]);

/**
 * Returns a shallow copy of the object with sensitive fields replaced
 * by "[REDACTED]". Does not mutate the original object.
 */
function redactSensitiveFields(
  obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!obj || typeof obj !== 'object') return obj;

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(key)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/** HTTP methods that represent mutating operations */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Audit log middleware. Logs all mutating requests (POST, PUT, PATCH, DELETE)
 * after the response is sent, capturing:
 * - User ID (from auth)
 * - HTTP method and endpoint
 * - Request body (with sensitive fields redacted)
 * - Response status code
 * - Timestamp
 *
 * Uses res.on('finish') so it does not add latency to the response.
 */
export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id ?? 'anonymous';

    logger.info(
      {
        audit: true,
        userId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        body: redactSensitiveFields(req.body as Record<string, unknown>),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
      `AUDIT ${req.method} ${req.originalUrl} -> ${res.statusCode}`
    );
  });

  next();
}
