import type { Request, Response } from 'express';
import { createReviewSchema } from '@earth-revibe/shared';
import { reviewService } from '../services/review.service';
import { ApiError } from '../utils/api-error';

export const reviewController = {
  async listByProduct(req: Request, res: Response) {
    const productId = req.params.productId as string;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await reviewService.listApprovedByProduct({ productId, page, limit });
    res.json({ success: true, data: result });
  },

  async create(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) throw ApiError.unauthorized();

    const input = createReviewSchema.parse(req.body);
    const review = await reviewService.createReview(userId, input);
    res.status(201).json({ success: true, data: review });
  },
};
