import type { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '@earth-revibe/db';
import { logger } from '../config/logger';

const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Idempotency middleware for payment-critical endpoints.
 * Checks X-Idempotency-Key header and prevents duplicate processing.
 *
 * - If key exists and COMPLETED: returns cached response
 * - If key exists and PROCESSING: returns 409 Conflict
 * - If new key: creates PROCESSING record, proceeds, then stores response
 */
export function idempotency(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers['x-idempotency-key'];

    // If no key provided, proceed without idempotency protection
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return next();
    }

    const userId = (req as any).user?.id || 'anonymous';

    try {
      // Check for existing key
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existing) {
        // Check if expired
        if (existing.expiresAt < new Date()) {
          // Expired key — delete and allow retry
          await prisma.idempotencyKey.delete({ where: { id: existing.id } });
        } else if (existing.status === 'COMPLETED' && existing.response) {
          // Return cached response
          const cached = existing.response as { statusCode: number; body: unknown };
          return res.status(cached.statusCode).json(cached.body);
        } else if (existing.status === 'PROCESSING') {
          return res.status(409).json({
            success: false,
            error: {
              code: 'CONFLICT',
              message: 'A request with this idempotency key is currently being processed',
            },
          });
        }
        // FAILED status — allow retry by falling through
      }

      // Create new PROCESSING record
      const record = await prisma.idempotencyKey.upsert({
        where: { key: idempotencyKey },
        create: {
          key: idempotencyKey,
          userId,
          status: 'PROCESSING',
          endpoint,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_KEY_TTL_MS),
        },
        update: {
          status: 'PROCESSING',
          userId,
          endpoint,
          response: Prisma.JsonNull,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_KEY_TTL_MS),
        },
      });

      // Intercept res.json to capture and cache the response
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        const statusCode = res.statusCode;

        // Store response asynchronously — don't block the response
        prisma.idempotencyKey
          .update({
            where: { id: record.id },
            data: {
              status: statusCode >= 200 && statusCode < 300 ? 'COMPLETED' : 'FAILED',
              response: { statusCode, body } as any,
            },
          })
          .catch((err) => {
            logger.error({ err, idempotencyKey, endpoint }, 'Failed to store idempotency response');
          });

        return originalJson(body);
      };

      return next();
    } catch (err) {
      logger.error(
        { err, endpoint },
        'Idempotency middleware failed, proceeding without protection'
      );
      return next();
    }
  };
}
