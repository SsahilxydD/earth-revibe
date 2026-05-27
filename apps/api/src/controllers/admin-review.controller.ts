import type { Request, Response } from 'express';
import {
  adminReviewProductsQuerySchema,
  adminReviewsByProductQuerySchema,
  updateReviewApprovalSchema,
} from '@earth-revibe/shared';
import { adminReviewService } from '../services/admin-review.service';

export const adminReviewController = {
  async listProductsWithReviewStats(req: Request, res: Response) {
    const query = adminReviewProductsQuerySchema.parse(req.query);
    const result = await adminReviewService.listProductsWithReviewStats(query);
    res.json({ success: true, data: result });
  },

  async listReviewsByProduct(req: Request, res: Response) {
    const productId = req.params.productId as string;
    const query = adminReviewsByProductQuerySchema.parse(req.query);
    const result = await adminReviewService.listReviewsByProduct(productId, query);
    res.json({ success: true, data: result });
  },

  async updateApproval(req: Request, res: Response) {
    const id = req.params.id as string;
    const { isApproved } = updateReviewApprovalSchema.parse(req.body);
    const result = await adminReviewService.updateApproval(id, isApproved);
    res.json({ success: true, data: result });
  },

  async deleteReview(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminReviewService.deleteReview(id);
    res.json({ success: true, data: result });
  },
};
