import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');

  // Surface error message + stack to clients for the duration of debugging
  // a 500 in production. Sentry already has the full stack; this just makes
  // the JSON response useful when Railway log access is slow. Revert once
  // the bug is identified.
  const debugInfo =
    env.NODE_ENV !== 'test'
      ? {
          message: err.message,
          name: err.name,
          stack: err.stack?.split('\n').slice(0, 8),
        }
      : undefined;

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      debug: debugInfo,
    },
  });
};
