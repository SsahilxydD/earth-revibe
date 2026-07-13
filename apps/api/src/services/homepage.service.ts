import { prisma, Prisma } from '@earth-revibe/db';
import {
  homepageFeaturedContentSchema,
  homepageHeroContentSchema,
  homepageStoryStackContentSchema,
  homepageVibeCardContentSchema,
  type CreateHomepageBlockInput,
  type HomepageBlockType,
  type HomepageFeaturedProduct,
  type HomepagePayload,
  type UpdateHomepageBlockInput,
} from '@earth-revibe/shared';
import type { z } from 'zod';
import { ApiError } from '../utils/api-error';

const CONTENT_SCHEMAS: Record<HomepageBlockType, z.ZodType> = {
  HERO: homepageHeroContentSchema,
  STORY_STACK: homepageStoryStackContentSchema,
  VIBE_CARD: homepageVibeCardContentSchema,
  FEATURED_PRODUCTS: homepageFeaturedContentSchema,
};

/** One active block each; upserted by type instead of created freely. */
const SINGLETON_TYPES: HomepageBlockType[] = ['HERO', 'FEATURED_PRODUCTS'];

function parseContent<T>(schema: z.ZodType<T>, content: unknown): T {
  const result = schema.safeParse(content);
  if (!result.success) {
    throw ApiError.badRequest(
      'Invalid block content',
      result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    );
  }
  return result.data;
}

const featuredProductSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  category: { select: { name: true } },
  images: {
    orderBy: { sortOrder: 'asc' as const },
    select: { url: true, isPrimary: true },
    take: 4,
  },
} satisfies Prisma.ProductSelect;

type FeaturedProductRow = Prisma.ProductGetPayload<{ select: typeof featuredProductSelect }>;

/**
 * Resolve product rows into homepage cards, keeping the caller's row order.
 * Ratings come from one grouped query over approved reviews (no N+1) — same
 * approach as productService.listProducts.
 */
async function toFeaturedCards(products: FeaturedProductRow[]): Promise<HomepageFeaturedProduct[]> {
  if (products.length === 0) return [];

  const ratingRows = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: products.map((p) => p.id) }, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const ratingByProduct = new Map(ratingRows.map((r) => [r.productId, r]));

  return products.map((p) => {
    const r = ratingByProduct.get(p.id);
    return {
      slug: p.slug,
      name: p.name,
      price: Number(p.price),
      category: p.category?.name?.toUpperCase() ?? 'PIECE',
      image: p.images.find((i) => i.isPrimary)?.url ?? p.images[0]?.url ?? null,
      rating: r?._avg.rating != null ? Math.round(r._avg.rating * 10) / 10 : null,
      reviews: r?._count._all ?? 0,
    };
  });
}

export const homepageService = {
  /**
   * Composed public homepage payload. Blocks with content that no longer
   * passes its schema are skipped, never surfaced — one bad row must not
   * take the storefront homepage down.
   */
  async getPublicHomepage(): Promise<HomepagePayload> {
    const blocks = await prisma.homepageBlock.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const heroBlock = blocks.find((b) => b.type === 'HERO');
    const heroResult = heroBlock ? homepageHeroContentSchema.safeParse(heroBlock.content) : null;
    const hero = heroResult?.success ? heroResult.data : null;

    const storyStacks = blocks
      .filter((b) => b.type === 'STORY_STACK')
      .flatMap((b) => {
        const result = homepageStoryStackContentSchema.safeParse(b.content);
        return result.success ? [{ id: b.id, ...result.data }] : [];
      });

    const seenVibes = new Set<string>();
    const vibeCardsRaw = blocks
      .filter((b) => b.type === 'VIBE_CARD')
      .flatMap((b) => {
        const result = homepageVibeCardContentSchema.safeParse(b.content);
        // One card per vibe — first (lowest sortOrder) wins if rows ever duplicate.
        if (!result.success || seenVibes.has(result.data.vibe)) return [];
        seenVibes.add(result.data.vibe);
        return [{ id: b.id, ...result.data }];
      });

    const featuredBlock = blocks.find((b) => b.type === 'FEATURED_PRODUCTS');
    const featuredResult = featuredBlock
      ? homepageFeaturedContentSchema.safeParse(featuredBlock.content)
      : null;
    const curatedIds = featuredResult?.success ? featuredResult.data.productIds : [];

    const [pieceCounts, featuredRows] = await Promise.all([
      Promise.all(
        vibeCardsRaw.map((c) =>
          prisma.product.count({ where: { status: 'ACTIVE', vibes: { has: c.vibe } } })
        )
      ),
      curatedIds.length > 0
        ? prisma.product.findMany({
            where: { id: { in: curatedIds }, status: 'ACTIVE' },
            select: featuredProductSelect,
          })
        : // No curated picks yet — fall back to the legacy isFeatured flag so
          // the storefront keeps its featured rail until the admin curates one.
          prisma.product.findMany({
            where: { isFeatured: true, status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: featuredProductSelect,
          }),
    ]);

    // findMany({ id: { in } }) does not preserve input order — restore the
    // admin's curated sequence before mapping to cards.
    const orderedRows =
      curatedIds.length > 0
        ? [...featuredRows].sort((a, b) => curatedIds.indexOf(a.id) - curatedIds.indexOf(b.id))
        : featuredRows;

    return {
      hero,
      storyStacks,
      vibeCards: vibeCardsRaw.map((c, i) => ({ ...c, pieceCount: pieceCounts[i] ?? null })),
      featured: await toFeaturedCards(orderedRows),
    };
  },

  async listBlocks() {
    return prisma.homepageBlock.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  },

  async createBlock(input: CreateHomepageBlockInput) {
    if (SINGLETON_TYPES.includes(input.type)) {
      const existing = await prisma.homepageBlock.findFirst({ where: { type: input.type } });
      if (existing) {
        throw ApiError.conflict(`${input.type} already exists — update it instead`);
      }
    }
    const last = await prisma.homepageBlock.findFirst({
      where: { type: input.type },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return prisma.homepageBlock.create({
      data: {
        type: input.type,
        content: input.content as Prisma.InputJsonValue,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  },

  /** Create-or-update the single block of a singleton type (HERO / FEATURED_PRODUCTS). */
  async upsertSingleton(type: 'HERO' | 'FEATURED_PRODUCTS', content: unknown) {
    const parsed = parseContent(CONTENT_SCHEMAS[type], content) as Prisma.InputJsonValue;
    const existing = await prisma.homepageBlock.findFirst({ where: { type } });
    if (existing) {
      return prisma.homepageBlock.update({
        where: { id: existing.id },
        data: { content: parsed, isActive: true },
      });
    }
    return prisma.homepageBlock.create({ data: { type, content: parsed } });
  },

  async updateBlock(id: string, input: UpdateHomepageBlockInput) {
    const block = await prisma.homepageBlock.findUnique({ where: { id } });
    if (!block) throw ApiError.notFound('Homepage block not found');

    const data: Prisma.HomepageBlockUpdateInput = {};
    if (input.content !== undefined) {
      const schema = CONTENT_SCHEMAS[block.type as HomepageBlockType];
      if (!schema) throw ApiError.badRequest(`Unknown block type: ${block.type}`);
      data.content = parseContent(schema, input.content) as Prisma.InputJsonValue;
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return prisma.homepageBlock.update({ where: { id }, data });
  },

  async deleteBlock(id: string) {
    const block = await prisma.homepageBlock.findUnique({ where: { id }, select: { id: true } });
    if (!block) throw ApiError.notFound('Homepage block not found');
    await prisma.homepageBlock.delete({ where: { id } });
  },

  /** Persist a new order for the given ids (index = sortOrder). Callers send
   *  one type's ids at a time; ordering only matters within a type. */
  async reorderBlocks(orderedIds: string[]) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.homepageBlock.update({ where: { id }, data: { sortOrder: index } })
      )
    );
  },
};
