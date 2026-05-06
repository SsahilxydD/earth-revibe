import './config/sentry';
import cron from 'node-cron';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { APP_CONSTANTS } from './config/constants';
import { prisma } from '@earth-revibe/db';
import { shutdownPostHog } from './config/posthog';
import { runAbandonedCartCheck } from './jobs/abandoned-cart-job';
import { engagementRuleService } from './services/engagement-rule.service';
import { customerSegmentService } from './services/customer-segment.service';

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

    // Engagement rule evaluator — every 30 min. Idempotent (dedupe via the
    // EngagementRuleFire unique key), so overlap or restart is safe.
    const engagementRuleTask = cron.schedule(
      '*/30 * * * *',
      () => {
        engagementRuleService
          .runCron()
          .then((result) => {
            if (result.fires > 0 || result.errors > 0) {
              logger.info(result, 'Engagement rule cron complete');
            }
          })
          .catch((err) => {
            logger.error({ err }, 'Engagement rule cron failed');
          });
      },
      { timezone: 'Asia/Kolkata' }
    );

    logger.info('Engagement rule cron scheduled: every 30 min (Asia/Kolkata)');

    // Customer-segment refresh — once a day at 03:17 local. Off-peak so the
    // groupBy passes don't fight admin-dashboard reads. The refresh()
    // endpoint is the on-demand path; this is just the slow safety net.
    const customerSegmentTask = cron.schedule(
      '17 3 * * *',
      () => {
        customerSegmentService
          .runCron()
          .then((result) => {
            logger.info(result, 'Customer segment cron complete');
          })
          .catch((err) => {
            logger.error({ err }, 'Customer segment cron failed');
          });
      },
      { timezone: 'Asia/Kolkata' }
    );

    logger.info('Customer segment cron scheduled: 03:17 daily (Asia/Kolkata)');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully');
      abandonedCartTask.stop();
      engagementRuleTask.stop();
      customerSegmentTask.stop();
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
