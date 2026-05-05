import './config/sentry';
import cron from 'node-cron';
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

    // Abandoned cart sweep — every 15 minutes via node-cron.
    // The mutex inside runAbandonedCartCheck prevents overlap with admin
    // "Run sweep now" clicks. We use cron (not setInterval) for the same
    // reason every other scheduled job uses cron: explicit schedule, no drift,
    // and it's the standard the rest of the codebase will use going forward.
    const abandonedCartTask = cron.schedule(
      '*/15 * * * *',
      () => {
        runAbandonedCartCheck().catch((err) => {
          logger.error({ err }, 'Scheduled abandoned cart sweep failed');
        });
      },
      { timezone: 'Asia/Kolkata' }
    );

    // Run once on startup (after a short delay so the DB pool is warm)
    setTimeout(() => {
      runAbandonedCartCheck().catch((err) => {
        logger.error({ err }, 'Initial abandoned cart sweep failed');
      });
    }, 10_000);

    logger.info('Abandoned cart cron scheduled: every 15 min (Asia/Kolkata)');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully');
      abandonedCartTask.stop();
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
