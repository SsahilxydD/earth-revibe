import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
});

export const reviewApprovalStatusSchema = z.enum(['all', 'approved', 'pending']);

export const adminReviewProductsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['pendingCount', 'reviewCount', 'avgRating', 'name']).default('pendingCount'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminReviewsByProductQuerySchema = z.object({
  status: reviewApprovalStatusSchema.default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateReviewApprovalSchema = z.object({
  isApproved: z.boolean(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewApprovalStatus = z.infer<typeof reviewApprovalStatusSchema>;
export type AdminReviewProductsQuery = z.infer<typeof adminReviewProductsQuerySchema>;
export type AdminReviewsByProductQuery = z.infer<typeof adminReviewsByProductQuerySchema>;
export type UpdateReviewApprovalInput = z.infer<typeof updateReviewApprovalSchema>;
