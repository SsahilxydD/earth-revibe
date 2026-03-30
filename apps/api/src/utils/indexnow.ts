import { env } from '../config/env';
import { logger } from '../config/logger';

const INDEXNOW_KEY = '503e3e286040107b84bf2d9a67bcea9b';
const SITE_HOST = 'earthrevibe.com';

/**
 * Notify search engines (Bing, Yandex, Naver, Seznam) about URL changes via IndexNow.
 * Call this when products or pages are created, updated, or deleted.
 */
export async function notifyIndexNow(paths: string[]): Promise<void> {
  if (env.NODE_ENV !== 'production' || paths.length === 0) return;

  const urlList = paths.map((p) => `https://${SITE_HOST}${p}`);

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });

    logger.info({ status: res.status, urlCount: urlList.length }, 'IndexNow submitted');
  } catch (err) {
    logger.error({ err }, 'IndexNow submission failed');
  }
}
