import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type { AdminReviewProductsQuery, AdminReviewsByProductQuery } from '@earth-revibe/shared';

export const adminReviewService = {
  async listProductsWithReviewStats(query: AdminReviewProductsQuery) {
    const { search, page, limit, sortBy, sortOrder } = query;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Strategy: aggregate review stats per productId once, then either:
    //   - sort by stats (pendingCount / reviewCount / avgRating): slice product IDs
    //     by the sorted stats, then fetch the products in that order.
    //   - sort by product name: paginate the products table directly and join
    //     stats per page.
    // This avoids loading the entire product catalog into memory when sorting
    // by review aggregates, and keeps name-sort fully indexed in Postgres.

    if (sortBy === 'name') {
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { name: sortOrder },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          },
        }),
        prisma.product.count({ where }),
      ]);

      const productIds = products.map((p) => p.id);
      const stats = await loadStatsByProductIds(productIds);
      const items = products.map((p) => mergeStats(p, stats));

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // Stats-sorted path — only products that match the (optional) search filter
    // participate. We need all matching productIds to sort properly.
    const matching = await prisma.product.findMany({
      where,
      select: { id: true },
    });
    const matchingIds = matching.map((m) => m.id);
    if (matchingIds.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const allStats = await loadStatsByProductIds(matchingIds);

    // Build a sortable array of { productId, total, pending, avg } across the
    // entire matching set (products without reviews contribute zeros).
    const sortable = matchingIds.map((id) => {
      const s = allStats.get(id);
      return {
        id,
        reviewCount: s?.total ?? 0,
        pendingCount: s?.pending ?? 0,
        avgRating: s?.avg ?? 0,
      };
    });

    sortable.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * dir;
    });

    const pageIds = sortable.slice((page - 1) * limit, page * limit).map((s) => s.id);
    const products = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const items = pageIds
      .map((id) => productMap.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => mergeStats(p, allStats));

    return {
      items,
      total: sortable.length,
      page,
      limit,
      totalPages: Math.ceil(sortable.length / limit),
    };
  },

  async listReviewsByProduct(productId: string, query: AdminReviewsByProductQuery) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!product) throw ApiError.notFound('Product not found');

    const where: Prisma.ReviewWhereInput = { productId };
    if (query.status === 'approved') where.isApproved = true;
    if (query.status === 'pending') where.isApproved = false;

    const [reviews, total, allTimeStats] = await Promise.all([
      prisma.review.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          isVerified: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ['isApproved'],
        where: { productId },
        _count: { _all: true },
        _avg: { rating: true },
      }),
    ]);

    const approvedRow = allTimeStats.find((r) => r.isApproved);
    const pendingRow = allTimeStats.find((r) => !r.isApproved);

    const approvedCount = approvedRow?._count._all ?? 0;
    const pendingCount = pendingRow?._count._all ?? 0;
    const reviewCount = approvedCount + pendingCount;

    // Weighted average across approved + pending so the admin sees the true
    // distribution before moderating, not just the public-facing slice.
    const avg =
      reviewCount === 0
        ? null
        : ((approvedRow?._avg.rating ?? 0) * approvedCount +
            (pendingRow?._avg.rating ?? 0) * pendingCount) /
          reviewCount;

    return {
      product,
      reviews,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      stats: {
        reviewCount,
        approvedCount,
        pendingCount,
        avgRating: avg,
      },
    };
  },

  async updateApproval(id: string, isApproved: boolean) {
    const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Review not found');

    return prisma.review.update({
      where: { id },
      data: { isApproved },
      select: {
        id: true,
        productId: true,
        isApproved: true,
        updatedAt: true,
      },
    });
  },

  async deleteReview(id: string) {
    const existing = await prisma.review.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!existing) throw ApiError.notFound('Review not found');

    await prisma.review.delete({ where: { id } });
    return { id, productId: existing.productId };
  },
};

interface ReviewStats {
  total: number;
  pending: number;
  avg: number | null;
}

async function loadStatsByProductIds(productIds: string[]): Promise<Map<string, ReviewStats>> {
  if (productIds.length === 0) return new Map();

  const [overall, pending] = await Promise.all([
    prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, isApproved: false },
      _count: { _all: true },
    }),
  ]);

  const stats = new Map<string, ReviewStats>();
  for (const row of overall) {
    stats.set(row.productId, {
      total: row._count._all,
      pending: 0,
      avg: row._avg.rating,
    });
  }
  for (const row of pending) {
    const existing = stats.get(row.productId);
    if (existing) {
      existing.pending = row._count._all;
    } else {
      stats.set(row.productId, { total: 0, pending: row._count._all, avg: null });
    }
  }
  return stats;
}

function mergeStats<T extends { id: string }>(product: T, stats: Map<string, ReviewStats>) {
  const s = stats.get(product.id);
  return {
    ...product,
    reviewCount: s?.total ?? 0,
    pendingCount: s?.pending ?? 0,
    avgRating: s?.avg ?? null,
  };
}
