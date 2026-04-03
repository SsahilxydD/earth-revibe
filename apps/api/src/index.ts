import './config/sentry';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { APP_CONSTANTS } from './config/constants';
import { prisma } from '@earth-revibe/db';
import { shutdownPostHog } from './config/posthog';
import { runAbandonedCartCheck } from './jobs/abandoned-cart-job';

const start = async () => {
  try {
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Earth Revibe API running');
    });

    // Run abandoned cart check every 30 minutes
    const THIRTY_MINUTES = 30 * 60 * 1000;
    const abandonedCartInterval = setInterval(() => {
      runAbandonedCartCheck().catch((err) => {
        logger.error({ err }, 'Abandoned cart job failed');
      });
    }, THIRTY_MINUTES);
    // Run once on startup after a short delay
    setTimeout(() => {
      runAbandonedCartCheck().catch((err) => {
        logger.error({ err }, 'Initial abandoned cart check failed');
      });
    }, 10_000);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully');
      clearInterval(abandonedCartInterval);
      server.close(async () => {
        logger.info('HTTP server closed');
        await shutdownPostHog();
        await prisma.$disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      });

      // Force exit if graceful shutdown stalls
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, APP_CONSTANTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

// Global error handlers — prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

start();
