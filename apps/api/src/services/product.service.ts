import slugify from "slugify";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
  ProductVariantInput,
} from "@earth-revibe/shared";

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

export const productService = {
  async listProducts(query: ProductQuery) {
    const {
      category,
      status,
      minPrice,
      maxPrice,
      size,
      color,
      material,
      search,
      isFeatured,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    // Build where clause dynamically
    const where: Record<string, unknown> = {};

    // Default to ACTIVE for public queries (when no status filter specified)
    if (status) {
      where.status = status;
    } else {
      where.status = "ACTIVE";
    }

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as Record<string, unknown>).gte = minPrice;
      if (maxPrice !== undefined) (where.price as Record<string, unknown>).lte = maxPrice;
    }

    if (material) {
      where.material = { contains: material, mode: "insensitive" };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by variant attributes
    if (size || color) {
      const variantFilter: Record<string, unknown> = {};
      if (size) variantFilter.size = size;
      if (color) variantFilter.color = { contains: color, mode: "insensitive" };
      where.variants = { some: variantFilter };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.product.count({ where: where as any }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
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
      throw ApiError.notFound("Product not found");
    }

    return product;
  },

  async createProduct(data: CreateProductInput) {
    // Validate categoryId exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw ApiError.badRequest("Category not found");
    }

    // Auto-generate slug if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check slug uniqueness
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw ApiError.conflict("A product with this slug already exists");
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
        status: data.status,
        isFeatured: data.isFeatured,
        categoryId: data.categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: true,
        variants: true,
      },
    });

    return product;
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    // Check product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }

    // Validate categoryId if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw ApiError.badRequest("Category not found");
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
        throw ApiError.conflict("A product with this slug already exists");
      }
    }

    const { categoryId, ...rest } = data;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(slug ? { slug } : {}),
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

    return product;
  },

  async deleteProduct(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound("Product not found");
    }

    // Soft delete by setting status to ARCHIVED
    const product = await prisma.product.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return product;
  },

  async addProductVariants(productId: string, variants: ProductVariantInput[]) {
    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    const created = await prisma.productVariant.createMany({
      data: variants.map((v) => ({
        productId,
        sku: v.sku,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        price: v.price,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        isActive: v.isActive,
      })),
    });

    // Return the created variants
    const productVariants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: created.count,
    });

    return productVariants;
  },

  async updateProductVariant(variantId: string, data: Partial<ProductVariantInput>) {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw ApiError.notFound("Product variant not found");
    }

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });

    return variant;
  },

  async deleteProductVariant(variantId: string) {
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!existing) {
      throw ApiError.notFound("Product variant not found");
    }

    await prisma.productVariant.delete({ where: { id: variantId } });
  },
};
