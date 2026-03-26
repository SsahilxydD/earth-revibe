import type { Request, Response } from 'express';
import { blogService } from '../services/blog.service';

export const blogController = {
  async listPublished(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const categorySlug = req.query.category as string | undefined;
    const result = await blogService.listPublished(page, limit, categorySlug);
    res.json({ success: true, data: result });
  },

  async getBySlug(req: Request, res: Response) {
    const slug = req.params.slug as string;
    const post = await blogService.getPublishedBySlug(slug);
    res.json({ success: true, data: post });
  },

  async listCategories(_req: Request, res: Response) {
    const categories = await blogService.listCategories();
    res.json({ success: true, data: categories });
  },
};
