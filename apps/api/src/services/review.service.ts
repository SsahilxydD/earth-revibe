import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type { CreateReviewInput } from '@earth-revibe/shared';

interface ListApprovedReviewsParams {
  productId: string;
  page: number;
  limit: number;
}

export const reviewService = {
  async listApprovedByProduct({ productId, page, limit }: ListApprovedReviewsParams) {
    const where = { productId, isApproved: true };
    const [reviews, total, ratingAgg] = await Promise.all([
      prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          isVerified: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      avgRating: ratingAgg._avg.rating ?? null,
    };
  },

  async createReview(userId: string, input: CreateReviewInput) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, status: true },
    });
    if (!product) throw ApiError.notFound('Product not found');
    if (product.status !== 'ACTIVE') {
      throw ApiError.badRequest('Cannot review an inactive product');
    }

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: input.productId, userId } },
      select: { id: true },
    });
    if (existing) throw ApiError.conflict('You have already reviewed this product');

    // Verified purchase = at least one DELIVERED order from this user containing
    // a variant of this product (OrderItem joins ProductVariant, not Product
    // directly). Soft-deleted orders are excluded.
    const deliveredCount = await prisma.order.count({
      where: {
        userId,
        status: 'DELIVERED',
        deletedAt: null,
        items: { some: { variant: { productId: input.productId } } },
      },
    });

    const review = await prisma.review.create({
      data: {
        productId: input.productId,
        userId,
        rating: input.rating,
        title: input.title,
        content: input.content,
        isVerified: deliveredCount > 0,
      },
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        isVerified: true,
        isApproved: true,
        createdAt: true,
      },
    });

    return review;
  },
};
