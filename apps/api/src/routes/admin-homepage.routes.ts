import { Router, type IRouter } from 'express';
import type { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  UserRole,
  createHomepageBlockSchema,
  homepageFeaturedContentSchema,
  homepageHeroContentSchema,
  reorderHomepageBlocksSchema,
  updateHomepageBlockSchema,
} from '@earth-revibe/shared';
import { homepageService } from '../services/homepage.service';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// GET /api/v1/admin/homepage — all blocks, including inactive
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const blocks = await homepageService.listBlocks();
    res.json({ success: true, data: blocks });
  })
);

// PUT /api/v1/admin/homepage/hero — upsert the hero singleton
router.put(
  '/hero',
  validate({ body: homepageHeroContentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const block = await homepageService.upsertSingleton('HERO', req.body);
    res.json({ success: true, data: block });
  })
);

// PUT /api/v1/admin/homepage/featured — upsert the curated featured-products singleton
router.put(
  '/featured',
  validate({ body: homepageFeaturedContentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const block = await homepageService.upsertSingleton('FEATURED_PRODUCTS', req.body);
    res.json({ success: true, data: block });
  })
);

// PUT /api/v1/admin/homepage/blocks/reorder — MUST be before /blocks/:id
router.put(
  '/blocks/reorder',
  validate({ body: reorderHomepageBlocksSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await homepageService.reorderBlocks(req.body.orderedIds);
    res.json({ success: true });
  })
);

// POST /api/v1/admin/homepage/blocks — create a STORY_STACK / VIBE_CARD block
router.post(
  '/blocks',
  validate({ body: createHomepageBlockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const block = await homepageService.createBlock(req.body);
    res.status(201).json({ success: true, data: block });
  })
);

// PATCH /api/v1/admin/homepage/blocks/:id — update content / sortOrder / isActive
router.patch(
  '/blocks/:id',
  validate({ body: updateHomepageBlockSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const block = await homepageService.updateBlock(String(req.params.id), req.body);
    res.json({ success: true, data: block });
  })
);

// DELETE /api/v1/admin/homepage/blocks/:id
router.delete(
  '/blocks/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await homepageService.deleteBlock(String(req.params.id));
    res.json({ success: true });
  })
);

export { router as adminHomepageRouter };
