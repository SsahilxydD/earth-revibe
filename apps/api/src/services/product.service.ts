import slugify from 'slugify';
import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import { notifyIndexNow } from '../utils/indexnow';
import { logger } from '../config/logger';
import { backInStockService } from './back-in-stock.service';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
  ProductVariantInput,
} from '@earth-revibe/shared';

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

const listCache = new Map<string, { data: unknown; expiresAt: number }>();
const LIST_CACHE_TTL_MS = 60_000;

function getListCacheKey(query: ProductQuery): string {
  const sorted = Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify(sorted);
}

function invalidateListCache() {
  listCache.clear();
}

export const productService = {
  async listProducts(query: ProductQuery, adminMode = false) {
    const {
      category,
      slugs,
      vibe,
      status,
      minPrice,
      maxPrice,
      size,
      color,
      material,
      tag,
      search,
      isFeatured,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    if (!adminMode) {
      const cacheKey = getListCacheKey(query);
      const cached = listCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as Awaited<ReturnType<typeof productService.listProducts>>;
      }
    }

    // Build where clause dynamically
    const where: Prisma.ProductWhereInput = {};

    // In admin mode, show all statuses when no filter is specified
    // In public mode, default to ACTIVE only
    if (status) {
      where.status = status;
    } else if (!adminMode) {
      where.status = 'ACTIVE';
    }

    if (category) {
      // Resolve slugs → IDs first (one indexed lookup on categories.slug @@unique)
      // so the main query filters by FK directly, enabling the (status, categoryId)
      // composite index instead of joining through the categories table on every row.
      const slugList = Array.isArray(category) ? category : [category];
      const matchedCategories = await prisma.category.findMany({
        where: { slug: { in: slugList } },
        select: { id: true },
      });
      const categoryIds = matchedCategories.map((c) => c.id);

      if (categoryIds.length > 0) {
        const categoryFilter: Prisma.ProductWhereInput = {
          OR: [
            { categoryId: { in: categoryIds } },
            { productCategories: { some: { categoryId: { in: categoryIds } } } },
          ],
        };
        where.AND = [...((where.AND as Prisma.ProductWhereInput[]) || []), categoryFilter];
      }
    }

    if (slugs && slugs.length > 0) {
      where.slug = { in: slugs };
    }

    if (vibe) {
      where.vibes = { has: vibe };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (minPrice !== undefined) priceFilter.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.lte = maxPrice;
      where.price = priceFilter;
    }

    if (material) {
      where.material = { contains: material, mode: 'insensitive' };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by tag (e.g., mood-beach, mood-sunset)
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }

    // Filter by variant attributes
    if (size || color) {
      const variantFilter: Record<string, unknown> = {};
      if (size) variantFilter.size = size;
      if (color) variantFilter.color = { contains: color, mode: 'insensitive' };
      where.variants = { some: variantFilter };
    }

    const skip = (page - 1) * limit;

    // reviewCount is a computed field (count of reviews), not a column
    const orderBy =
      sortBy === 'reviewCount' ? { reviews: { _count: sortOrder } } : { [sortBy]: sortOrder };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy as any,
        // List view returns only what ProductCard needs. This cuts payload
        // by ~80% — the heavy text fields (description, care, SEO, etc.)
        // are loaded on demand by getProductBySlug for the PDP.
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          status: true,
          isFeatured: true,
          vibes: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true,
          // Up to 4 images per card — enables the tile-level swipe carousel
          // without ballooning the payload. Order by sortOrder so the slider
          // matches the merchandiser's intended sequence.
          images: {
            orderBy: { sortOrder: 'asc' },
            take: 4,
          },
          // ProductCard only needs stock, but Flight Mode bundles read
          // variants.{id,size,color} from the same list endpoint to render
          // the size picker and resolve variantId at add-to-cart. Keep these
          // — the heavy payload wins come from dropping description/SEO/care,
          // not tiny variant scalars.
          variants: {
            where: { isActive: true },
            select: { id: true, size: true, color: true, colorHex: true, stock: true },
            orderBy: { createdAt: 'asc' },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const result = {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    if (!adminMode) {
      listCache.set(getListCacheKey(query), {
        data: result,
        expiresAt: Date.now() + LIST_CACHE_TTL_MS,
      });
    }

    return result;
  },

  async getProductBySlug(slug: string, includeAll = false) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          ...(includeAll ? {} : { where: { isActive: true } }),
          orderBy: { createdAt: 'asc' },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    return product;
  },

  async createProduct(data: CreateProductInput) {
    // Validate categoryId exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw ApiError.badRequest('Category not found');
    }

    // Auto-generate slug if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check slug uniqueness
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw ApiError.conflict('A product with this slug already exists');
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        material: data.material,
        careInstructions: data.careInstructions,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        returnsInfo: data.returnsInfo,
        shippingInfo: data.shippingInfo,
        origin: data.origin,
        composition: data.composition,
        measurements: data.measurements,
        fabricWeight: data.fabricWeight,
        fit: data.fit,
        printType: data.printType,
        washInstructions: data.washInstructions,
        status: data.status,
        isFeatured: data.isFeatured,
        categoryId: data.categoryId,
        vibes: data.vibes ?? [],
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: true,
        variants: true,
      },
    });

    invalidateListCache();
    notifyIndexNow([`/products/${product.slug}`]).catch(() => {});

    return product;
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    // Check product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Product not found');
    }

    // Validate categoryId if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw ApiError.badRequest('Category not found');
      }
    }

    // Regenerate slug if name changes and no slug provided
    let slug = data.slug;
    if (data.name && data.name !== existing.name && !data.slug) {
      slug = generateSlug(data.name);
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const existingSlug = await prisma.product.findUnique({ where: { slug } });
      if (existingSlug) {
        throw ApiError.conflict('A product with this slug already exists');
      }
    }

    const { categoryId, price, compareAtPrice, ...rest } = data;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(slug ? { slug } : {}),
        ...(price !== undefined ? { price: String(price) } : {}),
        ...(compareAtPrice !== undefined ? { compareAtPrice: String(compareAtPrice) } : {}),
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      } as any,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: true,
        variants: true,
      },
    });

    invalidateListCache();
    notifyIndexNow([`/products/${product.slug}`]).catch(() => {});

    return product;
  },

  async deleteProduct(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Product not found');
    }

    // Soft delete by setting status to ARCHIVED
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    invalidateListCache();
    return product;
  },

  async addProductVariants(productId: string, variants: ProductVariantInput[]) {
    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Use a transaction with individual creates to get back the exact records
    const productVariants = await prisma.$transaction(
      variants.map((v) =>
        prisma.productVariant.create({
          data: {
            productId,
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            price: v.price,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            isActive: v.isActive,
          },
        })
      )
    );

    return productVariants;
  },

  async updateProductVariant(variantId: string, data: Partial<ProductVariantInput>) {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw ApiError.notFound('Product variant not found');
    }

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });

    // PR 10: fire back-in-stock alerts on a 0 → >0 stock transition. The
    // service no-ops for any other transition, so this is cheap to call
    // unconditionally. Async dispatched — admin update returns immediately;
    // the WhatsApp sends happen in the background. Errors are swallowed
    // so a Meta hiccup can't fail the inventory update.
    if (existing.stock !== variant.stock) {
      backInStockService
        .processStockTransition(variantId, existing.stock, variant.stock)
        .catch((err) => {
          logger.error({ err, variantId }, 'Back-in-stock dispatch failed');
        });
    }

    return variant;
  },

  async deleteProductVariant(variantId: string) {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw ApiError.notFound('Product variant not found');
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
  },

  // ---- Product Image Management ----

  async addProductImage(
    productId: string,
    data: { url: string; thumbnailUrl?: string; publicId: string; altText?: string }
  ) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Check if this is the first image — make it primary automatically
    const existingCount = await prisma.productImage.count({ where: { productId } });

    const image = await prisma.productImage.create({
      data: {
        productId,
        url: data.url,
        publicId: data.publicId,
        altText: data.altText,
        sortOrder: existingCount,
        isPrimary: existingCount === 0,
      },
    });

    return image;
  },

  async deleteProductImage(imageId: string) {
    const existing = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!existing) {
      throw ApiError.notFound('Product image not found');
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    // If this was the primary image, promote the next one
    if (existing.isPrimary) {
      const nextImage = await prisma.productImage.findFirst({
        where: { productId: existing.productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (nextImage) {
        await prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return existing;
  },

  async setProductImagePrimary(imageId: string) {
    const image = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) {
      throw ApiError.notFound('Product image not found');
    }

    // Remove primary from all images of this product, then set the chosen one
    await prisma.productImage.updateMany({
      where: { productId: image.productId },
      data: { isPrimary: false },
    });

    const updated = await prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });

    return updated;
  },

  async reorderProductImages(productId: string, imageIds: string[]) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Update sort order for each image and make the first one primary
    await Promise.all(
      imageIds.map((id, index) =>
        prisma.productImage.update({
          where: { id },
          data: { sortOrder: index, isPrimary: index === 0 },
        })
      )
    );

    return prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  },
};
