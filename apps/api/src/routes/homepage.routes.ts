import { Router, type IRouter } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { homepageService } from '../services/homepage.service';

const router: IRouter = Router();

// GET /api/v1/homepage — public, no auth required.
// Composed CMS payload: { hero, storyStacks, vibeCards, featured }.
// The storefront caches this via ISR (tag: 'homepage') and falls back to
// built-in defaults for any part that is empty.
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await homepageService.getPublicHomepage();
    res.json({ success: true, data });
  })
);

export { router as homepageRouter };
