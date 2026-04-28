import { prisma } from '@earth-revibe/db';

export const searchService = {
  async search(query: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where = {
      status: 'ACTIVE' as const,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
        { shortDescription: { contains: query, mode: 'insensitive' as const } },
        { category: { name: { contains: query, mode: 'insensitive' as const } } },
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 4 },
          category: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async autocomplete(query: string) {
    const [products, categories, blogPosts] = await Promise.all([
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          name: true,
          slug: true,
          price: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
        take: 5,
      }),
      prisma.category.findMany({
        where: {
          isActive: true,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { name: true, slug: true },
        take: 3,
      }),
      prisma.blogPost.findMany({
        where: {
          status: 'PUBLISHED',
          title: { contains: query, mode: 'insensitive' },
        },
        select: { title: true, slug: true },
        take: 2,
      }),
    ]);

    return { products, categories, blogPosts };
  },
};
