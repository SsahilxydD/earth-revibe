import { Router, type Router as RouterType } from 'express';
import { logger } from '../config/logger';
import { generateMetaCatalogFeed } from '../services/catalog-feed.service';

const router: RouterType = Router();

// In-memory cache to avoid hammering the DB when Meta's crawler polls.
// Feed refreshes every 10 minutes — new/edited products show up within that window.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cached: { body: string; at: number } | null = null;

router.get('/meta-feed.csv', async (_req, res) => {
  try {
    const now = Date.now();
    if (!cached || now - cached.at > CACHE_TTL_MS) {
      const body = await generateMetaCatalogFeed();
      cached = { body, at: now };
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=600');
    res.set('Content-Disposition', 'inline; filename="meta-catalog-feed.csv"');
    res.send(cached.body);
  } catch (err) {
    logger.error({ err }, 'Failed to generate Meta catalog feed');
    res.status(500).send('error generating feed');
  }
});

export { router as catalogFeedRouter };
