import type { Request, Response } from "express";
import { searchService } from "../services/search.service";

const MAX_SEARCH_LENGTH = 200;

export const searchController = {
  async search(req: Request, res: Response) {
    const { q, page, limit } = req.query as { q?: string; page?: string; limit?: string };
    if (!q || q.trim().length === 0) {
      res.json({ success: true, data: { products: [], total: 0, page: 1, limit: 20, totalPages: 0 } });
      return;
    }
    const query = q.trim().slice(0, MAX_SEARCH_LENGTH);
    const result = await searchService.search(query, Number(page) || 1, Math.min(Number(limit) || 20, 100));
    res.json({ success: true, data: result });
  },

  async autocomplete(req: Request, res: Response) {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) {
      res.json({ success: true, data: { products: [], categories: [], blogPosts: [] } });
      return;
    }
    const query = q.trim().slice(0, MAX_SEARCH_LENGTH);
    const result = await searchService.autocomplete(query);
    res.json({ success: true, data: result });
  },
};
