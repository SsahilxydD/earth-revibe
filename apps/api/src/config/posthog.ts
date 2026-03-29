import { PostHog } from 'posthog-node';
import { logger } from './logger';

let posthog: PostHog | null = null;

export function getPostHog(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null;

  if (!posthog) {
    posthog = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    });
    logger.info('PostHog server-side client initialized');
  }

  return posthog;
}

export async function shutdownPostHog(): Promise<void> {
  if (posthog) {
    await posthog.shutdown();
    logger.info('PostHog flushed and shut down');
  }
}
