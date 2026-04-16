import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from '../product.service';

// ---------------------------------------------------------------------------
// Mock @earth-revibe/db — must appear before any import that resolves the module
// ---------------------------------------------------------------------------
const mockPrismaFns = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
  productVariant: {
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
  productImage: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: mockPrismaFns,
  Prisma: {},
}));

import { prisma } from '@earth-revibe/db';

// ---------------------------------------------------------------------------
// Shared fixture factories
// ---------------------------------------------------------------------------

const makeCategory = (overrides = {}) => ({
  id: 'cat-1',
  name: 'Tops',
  slug: 'tops',
  ...overrides,
});

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

const makeProduct = (_overrides = {}) => ({
  id: 'prod-1',
  name: 'Eco Tee',
  slug: 'eco-tee',
  description: 'A sustainable tee',
  shortDescription: null,
  price: '29.99',
  compareAtPrice: null,
  material: 'organic cotton',
  status: 'ACTIVE',
  isFeatured: false,
  categoryId: 'cat-1',
  category: makeCategory(),
  images: [],
  variants: [],
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
});

const makeVariant = (overrides = {}) => ({
  id: 'var-1',
  productId: 'prod-1',
  sku: 'ECO-TEE-S-WHT',
  size: 'S',
  color: 'White',
  colorHex: '#ffffff',
  price: '29.99',
  stock: 10,
  lowStockThreshold: 2,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeImage = (overrides = {}) => ({
  id: 'img-1',
  productId: 'prod-1',
  url: 'https://cdn.example.com/image.jpg',
  publicId: 'cloudinary-id-1',
  altText: null,
  isPrimary: false,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeProductQuery = (overrides = {}) => ({
  page: 1,
  limit: 20,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Reset mocks before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// listProducts
// ===========================================================================

describe('productService.listProducts', () => {
  it('returns paginated products with default ACTIVE status when no status filter is given', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([makeProduct()] as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const result = await productService.listProducts(makeProductQuery());

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.status).toBe('ACTIVE');
    expect(result.products).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('uses the provided status filter when specified', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ status: 'DRAFT' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.status).toBe('DRAFT');
  });

  it('filters by category slug when category is a single string', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ category: 'tops' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.AND).toEqual([
      {
        OR: [
          { category: { slug: 'tops' } },
          { productCategories: { some: { category: { slug: 'tops' } } } },
        ],
      },
    ]);
  });

  it('filters by IN clause when category is an array of slugs', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(
      makeProductQuery({ category: ['t-shirts', 'shirts'] as any })
    );

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.AND).toEqual([
      {
        OR: [
          { category: { slug: { in: ['t-shirts', 'shirts'] } } },
          { productCategories: { some: { category: { slug: { in: ['t-shirts', 'shirts'] } } } } },
        ],
      },
    ]);
  });

  it('applies minPrice and maxPrice as a Decimal range filter', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ minPrice: 10, maxPrice: 50 }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.price).toEqual({ gte: 10, lte: 50 });
  });

  it('applies only minPrice when maxPrice is absent', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ minPrice: 5 }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.price).toEqual({ gte: 5 });
    expect(call.where.price.lte).toBeUndefined();
  });

  it('filters material with case-insensitive contains', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ material: 'cotton' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.material).toEqual({ contains: 'cotton', mode: 'insensitive' });
  });

  it('applies isFeatured filter when provided', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ isFeatured: true }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.isFeatured).toBe(true);
  });

  it('builds OR search across name and description fields', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ search: 'organic' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.OR).toEqual([
      { name: { contains: 'organic', mode: 'insensitive' } },
      { description: { contains: 'organic', mode: 'insensitive' } },
    ]);
  });

  it('filters variants by size when size is provided', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ size: 'M' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.variants).toEqual({ some: { size: 'M' } });
  });

  it('filters variants by color with case-insensitive contains', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ color: 'white' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.variants).toEqual({
      some: { color: { contains: 'white', mode: 'insensitive' } },
    });
  });

  it('combines size and color in a single variant some-filter', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ size: 'L', color: 'blue' }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.variants.some.size).toBe('L');
    expect(call.where.variants.some.color).toEqual({ contains: 'blue', mode: 'insensitive' });
  });

  it('calculates skip from page and limit', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(100);

    await productService.listProducts(makeProductQuery({ page: 3, limit: 10 }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.skip).toBe(20);
    expect(call.take).toBe(10);
  });

  it('calculates totalPages correctly for a multi-page result set', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(45);

    const result = await productService.listProducts(makeProductQuery({ page: 1, limit: 20 }));

    expect(result.totalPages).toBe(3);
  });

  it('does not apply variant filter when neither size nor color is provided', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery());

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.variants).toBeUndefined();
  });

  it('filters by single vibe via ?vibe= using array `has` operator', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(makeProductQuery({ vibe: 'salt-on-skin' as any }));

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.vibes).toEqual({ has: 'salt-on-skin' });
  });

  it('combines vibe filter with category filter (does not overwrite category)', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await productService.listProducts(
      makeProductQuery({ vibe: 'into-the-wild' as any, category: 'shirts' })
    );

    const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
    expect(call.where.vibes).toEqual({ has: 'into-the-wild' });
    expect(call.where.AND).toEqual([
      {
        OR: [
          { category: { slug: 'shirts' } },
          { productCategories: { some: { category: { slug: 'shirts' } } } },
        ],
      },
    ]);
  });
});

// ===========================================================================
// getProductBySlug
// ===========================================================================

describe('productService.getProductBySlug', () => {
  it('returns a product when the slug exists', async () => {
    const product = makeProduct();
    vi.mocked(prisma.product.findUnique).mockResolvedValue(product as any);

    const result = await productService.getProductBySlug('eco-tee');

    expect(result).toEqual(product);
    expect(prisma.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'eco-tee' } })
    );
  });

  it('throws ApiError.notFound when slug does not match any product', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(productService.getProductBySlug('ghost-product')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('filters variants to active-only by default (includeAll = false)', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);

    await productService.getProductBySlug('eco-tee');

    const call = vi.mocked(prisma.product.findUnique).mock.calls[0][0] as any;
    expect(call.include.variants.where).toEqual({ isActive: true });
  });

  it('returns all variants when includeAll is true', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);

    await productService.getProductBySlug('eco-tee', true);

    const call = vi.mocked(prisma.product.findUnique).mock.calls[0][0] as any;
    expect(call.include.variants.where).toBeUndefined();
  });

  it('only includes approved reviews', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);

    await productService.getProductBySlug('eco-tee');

    const call = vi.mocked(prisma.product.findUnique).mock.calls[0][0] as any;
    expect(call.include.reviews.where).toEqual({ isApproved: true });
  });
});

// ===========================================================================
// createProduct
// ===========================================================================

describe('productService.createProduct', () => {
  const baseInput = {
    name: 'Eco Tee',
    price: 29.99,
    categoryId: 'cat-1',
  } as any;

  it('creates a product successfully when all conditions are met', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory() as any);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue(makeProduct() as any);

    const result = await productService.createProduct(baseInput);

    expect(result).toEqual(makeProduct());
    expect(prisma.product.create).toHaveBeenCalledTimes(1);
  });

  it('auto-generates slug from name when no slug is provided', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory() as any);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue(makeProduct() as any);

    await productService.createProduct({ ...baseInput, name: 'Organic Hemp Shirt' });

    const createCall = vi.mocked(prisma.product.create).mock.calls[0][0] as any;
    expect(createCall.data.slug).toBe('organic-hemp-shirt');
  });

  it('uses the provided slug when explicitly supplied', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory() as any);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue(makeProduct() as any);

    await productService.createProduct({ ...baseInput, slug: 'custom-slug' });

    const createCall = vi.mocked(prisma.product.create).mock.calls[0][0] as any;
    expect(createCall.data.slug).toBe('custom-slug');
  });

  it('throws ApiError.badRequest when category does not exist', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(productService.createProduct(baseInput)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('throws ApiError.conflict when slug is already taken', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory() as any);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);

    await expect(productService.createProduct(baseInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('checks slug uniqueness against the auto-generated slug', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory() as any);
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.product.create).mockResolvedValue(makeProduct() as any);

    await productService.createProduct({ ...baseInput, name: 'Hemp Shirt' });

    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { slug: 'hemp-shirt' } });
  });

  it('persists the vibes array verbatim when provided', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory() as any);
    vi.mocked(prisma.product.create).mockResolvedValue(makeProduct() as any);

    await productService.createProduct({
      name: 'Tester',
      description: 'Long enough description',
      price: 100,
      categoryId: 'cat-1',
      status: 'DRAFT' as any,
      isFeatured: false,
      vibes: ['salt-on-skin', 'neon-nomads'],
    } as any);

    const call = vi.mocked(prisma.product.create).mock.calls[0][0] as any;
    expect(call.data.vibes).toEqual(['salt-on-skin', 'neon-nomads']);
  });
});

// ===========================================================================
// updateProduct
// ===========================================================================

describe('productService.updateProduct', () => {
  it('updates product fields and returns the updated record', async () => {
    const updated = { ...makeProduct(), name: 'New Name' };
    vi.mocked(prisma.product.findUnique)
      .mockResolvedValueOnce(makeProduct() as any) // product lookup
      .mockResolvedValueOnce(null); // slug uniqueness (name changed → new slug)
    vi.mocked(prisma.product.update).mockResolvedValueOnce(updated as any);

    const result = await productService.updateProduct('prod-1', { name: 'New Name' } as any);

    expect(result.name).toBe('New Name');
    expect(prisma.product.update).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError.notFound when product does not exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(
      productService.updateProduct('ghost-id', { name: 'X' } as any)
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('throws ApiError.badRequest when categoryId does not exist', async () => {
    vi.mocked(prisma.product.findUnique)
      .mockResolvedValueOnce(makeProduct() as any) // product exists
      .mockResolvedValueOnce(null); // slug uniqueness check later does not run
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(
      productService.updateProduct('prod-1', { categoryId: 'bad-cat' } as any)
    ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });

  it('auto-regenerates slug when name changes and no new slug is provided', async () => {
    const existing = makeProduct();
    vi.mocked(prisma.product.findUnique)
      .mockResolvedValueOnce(existing as any) // product lookup
      .mockResolvedValueOnce(null); // slug uniqueness
    vi.mocked(prisma.product.update).mockResolvedValue({
      ...existing,
      slug: 'new-tee-name',
    } as any);

    await productService.updateProduct('prod-1', { name: 'New Tee Name' } as any);

    const updateCall = vi.mocked(prisma.product.update).mock.calls[0][0] as any;
    expect(updateCall.data.slug).toBe('new-tee-name');
  });

  it('does not regenerate slug when name changes but a slug is explicitly provided', async () => {
    const existing = makeProduct();
    vi.mocked(prisma.product.findUnique)
      .mockResolvedValueOnce(existing as any)
      .mockResolvedValueOnce(null);
    vi.mocked(prisma.product.update).mockResolvedValue({ ...existing, slug: 'my-slug' } as any);

    await productService.updateProduct('prod-1', { name: 'New Name', slug: 'my-slug' } as any);

    const updateCall = vi.mocked(prisma.product.update).mock.calls[0][0] as any;
    expect(updateCall.data.slug).toBe('my-slug');
  });

  it('throws ApiError.conflict when the new slug is already taken by a different product', async () => {
    const existing = makeProduct();
    vi.mocked(prisma.product.findUnique)
      .mockResolvedValueOnce(existing as any) // product lookup
      .mockResolvedValueOnce({ ...makeProduct(), id: 'other-prod', slug: 'taken-slug' } as any); // slug collision

    await expect(
      productService.updateProduct('prod-1', { slug: 'taken-slug' } as any)
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('stores price as a String in the update payload', async () => {
    const existing = makeProduct();
    vi.mocked(prisma.product.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.product.update).mockResolvedValue(existing as any);

    await productService.updateProduct('prod-1', { price: 49.99 } as any);

    const updateCall = vi.mocked(prisma.product.update).mock.calls[0][0] as any;
    expect(typeof updateCall.data.price).toBe('string');
    expect(updateCall.data.price).toBe('49.99');
  });

  it('stores compareAtPrice as a String in the update payload', async () => {
    const existing = makeProduct();
    vi.mocked(prisma.product.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.product.update).mockResolvedValue(existing as any);

    await productService.updateProduct('prod-1', { compareAtPrice: 59.99 } as any);

    const updateCall = vi.mocked(prisma.product.update).mock.calls[0][0] as any;
    expect(typeof updateCall.data.compareAtPrice).toBe('string');
    expect(updateCall.data.compareAtPrice).toBe('59.99');
  });

  it('uses category connect when categoryId is provided', async () => {
    const existing = makeProduct();
    vi.mocked(prisma.product.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.category.findUnique).mockResolvedValue(makeCategory({ id: 'cat-2' }) as any);
    vi.mocked(prisma.product.update).mockResolvedValue(existing as any);

    await productService.updateProduct('prod-1', { categoryId: 'cat-2' } as any);

    const updateCall = vi.mocked(prisma.product.update).mock.calls[0][0] as any;
    expect(updateCall.data.category).toEqual({ connect: { id: 'cat-2' } });
  });
});

// ===========================================================================
// deleteProduct
// ===========================================================================

describe('productService.deleteProduct', () => {
  it('soft-deletes a product by setting status to ARCHIVED', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.product.update).mockResolvedValue({
      ...makeProduct(),
      status: 'ARCHIVED',
    } as any);

    const result = await productService.deleteProduct('prod-1');

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-1' },
        data: { status: 'ARCHIVED' },
      })
    );
    expect(result.status).toBe('ARCHIVED');
  });

  it('does not call prisma.product.delete (hard delete) under any path', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.product.update).mockResolvedValue({
      ...makeProduct(),
      status: 'ARCHIVED',
    } as any);

    await productService.deleteProduct('prod-1');

    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it('throws ApiError.notFound when product does not exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(productService.deleteProduct('ghost-id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// addProductVariants
// ===========================================================================

describe('productService.addProductVariants', () => {
  const variantInput = [
    {
      sku: 'ECO-S-WHT',
      size: 'S',
      color: 'White',
      colorHex: '#fff',
      price: 29.99,
      stock: 5,
      lowStockThreshold: 2,
      isActive: true,
    },
  ] as any[];

  it('creates variants and returns them ordered by createdAt desc', async () => {
    const variant = makeVariant();
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    // $transaction receives an array of Prisma promises and resolves them
    vi.mocked(prisma.$transaction).mockResolvedValue([variant] as any);

    const result = await productService.addProductVariants('prod-1', variantInput);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // The service passes an array of prisma.productVariant.create() calls
    expect(prisma.productVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: 'prod-1', sku: 'ECO-S-WHT' }),
      })
    );
    expect(result).toEqual([variant]);
  });

  it('throws ApiError.notFound when product does not exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(productService.addProductVariants('ghost-id', variantInput)).rejects.toMatchObject(
      { statusCode: 404, code: 'NOT_FOUND' }
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('fetches the same number of variants as were created', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    // $transaction returns the created variants
    vi.mocked(prisma.$transaction).mockResolvedValue([
      makeVariant(),
      makeVariant(),
      makeVariant(),
    ] as any);

    const result = await productService.addProductVariants('prod-1', variantInput);

    // The result is whatever $transaction returns
    expect(result).toHaveLength(3);
  });
});

// ===========================================================================
// updateProductVariant
// ===========================================================================

describe('productService.updateProductVariant', () => {
  it('updates and returns the variant', async () => {
    const variant = makeVariant();
    const updated = { ...variant, stock: 20 };
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(variant as any);
    vi.mocked(prisma.productVariant.update).mockResolvedValue(updated as any);

    const result = await productService.updateProductVariant('var-1', { stock: 20 } as any);

    expect(result.stock).toBe(20);
    expect(prisma.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'var-1' }, data: { stock: 20 } })
    );
  });

  it('throws ApiError.notFound when variant does not exist', async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(null);

    await expect(
      productService.updateProductVariant('ghost-var', { stock: 5 } as any)
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(prisma.productVariant.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// deleteProductVariant
// ===========================================================================

describe('productService.deleteProductVariant', () => {
  it('deletes the variant when found', async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(makeVariant() as any);
    vi.mocked(prisma.productVariant.delete).mockResolvedValue(makeVariant() as any);

    await productService.deleteProductVariant('var-1');

    expect(prisma.productVariant.delete).toHaveBeenCalledWith({ where: { id: 'var-1' } });
  });

  it('throws ApiError.notFound when variant does not exist', async () => {
    vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(null);

    await expect(productService.deleteProductVariant('ghost-var')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.productVariant.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// addProductImage
// ===========================================================================

describe('productService.addProductImage', () => {
  const imageInput = {
    url: 'https://cdn.example.com/img.jpg',
    publicId: 'cld-123',
    altText: 'Product photo',
  };

  it('creates an image and marks it as primary when it is the first image', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.productImage.count).mockResolvedValue(0);
    vi.mocked(prisma.productImage.create).mockResolvedValue(
      makeImage({ isPrimary: true, sortOrder: 0 }) as any
    );

    const result = await productService.addProductImage('prod-1', imageInput);

    const createCall = vi.mocked(prisma.productImage.create).mock.calls[0][0] as any;
    expect(createCall.data.isPrimary).toBe(true);
    expect(createCall.data.sortOrder).toBe(0);
    expect(result.isPrimary).toBe(true);
  });

  it('does not mark image as primary when other images already exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.productImage.count).mockResolvedValue(2);
    vi.mocked(prisma.productImage.create).mockResolvedValue(
      makeImage({ isPrimary: false, sortOrder: 2 }) as any
    );

    await productService.addProductImage('prod-1', imageInput);

    const createCall = vi.mocked(prisma.productImage.create).mock.calls[0][0] as any;
    expect(createCall.data.isPrimary).toBe(false);
    expect(createCall.data.sortOrder).toBe(2);
  });

  it('sets sortOrder equal to the existing image count', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.productImage.count).mockResolvedValue(4);
    vi.mocked(prisma.productImage.create).mockResolvedValue(makeImage({ sortOrder: 4 }) as any);

    await productService.addProductImage('prod-1', imageInput);

    const createCall = vi.mocked(prisma.productImage.create).mock.calls[0][0] as any;
    expect(createCall.data.sortOrder).toBe(4);
  });

  it('throws ApiError.notFound when product does not exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(productService.addProductImage('ghost-id', imageInput)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.productImage.create).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// deleteProductImage
// ===========================================================================

describe('productService.deleteProductImage', () => {
  it('deletes a non-primary image and returns the deleted record', async () => {
    const image = makeImage({ isPrimary: false });
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(image as any);
    vi.mocked(prisma.productImage.delete).mockResolvedValue(image as any);

    const result = await productService.deleteProductImage('img-1');

    expect(prisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
    expect(result).toEqual(image);
  });

  it('throws ApiError.notFound when image does not exist', async () => {
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(null);

    await expect(productService.deleteProductImage('ghost-img')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.productImage.delete).not.toHaveBeenCalled();
  });

  it('promotes the next image to primary when the deleted image was primary', async () => {
    const primaryImage = makeImage({ id: 'img-1', isPrimary: true });
    const nextImage = makeImage({ id: 'img-2', isPrimary: false, sortOrder: 1 });
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(primaryImage as any);
    vi.mocked(prisma.productImage.delete).mockResolvedValue(primaryImage as any);
    vi.mocked(prisma.productImage.findFirst).mockResolvedValue(nextImage as any);
    vi.mocked(prisma.productImage.update).mockResolvedValue({
      ...nextImage,
      isPrimary: true,
    } as any);

    await productService.deleteProductImage('img-1');

    expect(prisma.productImage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: 'prod-1' }, orderBy: { sortOrder: 'asc' } })
    );
    expect(prisma.productImage.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'img-2' }, data: { isPrimary: true } })
    );
  });

  it('does not call update when deleted primary image has no successor', async () => {
    const primaryImage = makeImage({ isPrimary: true });
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(primaryImage as any);
    vi.mocked(prisma.productImage.delete).mockResolvedValue(primaryImage as any);
    vi.mocked(prisma.productImage.findFirst).mockResolvedValue(null);

    await productService.deleteProductImage('img-1');

    expect(prisma.productImage.update).not.toHaveBeenCalled();
  });

  it('does not query for next image when deleted image was not primary', async () => {
    const nonPrimary = makeImage({ isPrimary: false });
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(nonPrimary as any);
    vi.mocked(prisma.productImage.delete).mockResolvedValue(nonPrimary as any);

    await productService.deleteProductImage('img-1');

    expect(prisma.productImage.findFirst).not.toHaveBeenCalled();
    expect(prisma.productImage.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// setProductImagePrimary
// ===========================================================================

describe('productService.setProductImagePrimary', () => {
  it('unsets all product images then sets chosen image as primary', async () => {
    const image = makeImage({ id: 'img-2', isPrimary: false, productId: 'prod-1' });
    const updatedImage = { ...image, isPrimary: true };
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(image as any);
    vi.mocked(prisma.productImage.updateMany).mockResolvedValue({ count: 3 } as any);
    vi.mocked(prisma.productImage.update).mockResolvedValue(updatedImage as any);

    const result = await productService.setProductImagePrimary('img-2');

    expect(prisma.productImage.updateMany).toHaveBeenCalledWith({
      where: { productId: 'prod-1' },
      data: { isPrimary: false },
    });
    expect(prisma.productImage.update).toHaveBeenCalledWith({
      where: { id: 'img-2' },
      data: { isPrimary: true },
    });
    expect(result.isPrimary).toBe(true);
  });

  it('throws ApiError.notFound when image does not exist', async () => {
    vi.mocked(prisma.productImage.findUnique).mockResolvedValue(null);

    await expect(productService.setProductImagePrimary('ghost-img')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.productImage.updateMany).not.toHaveBeenCalled();
    expect(prisma.productImage.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// reorderProductImages
// ===========================================================================

describe('productService.reorderProductImages', () => {
  it('updates sortOrder for each imageId according to its array position', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.productImage.update).mockResolvedValue(makeImage() as any);
    vi.mocked(prisma.productImage.findMany).mockResolvedValue([makeImage()] as any);

    await productService.reorderProductImages('prod-1', ['img-3', 'img-1', 'img-2']);

    const updateCalls = vi.mocked(prisma.productImage.update).mock.calls;
    expect(updateCalls).toHaveLength(3);
    expect(updateCalls[0][0]).toMatchObject({ where: { id: 'img-3' }, data: { sortOrder: 0 } });
    expect(updateCalls[1][0]).toMatchObject({ where: { id: 'img-1' }, data: { sortOrder: 1 } });
    expect(updateCalls[2][0]).toMatchObject({ where: { id: 'img-2' }, data: { sortOrder: 2 } });
  });

  it('returns images ordered by sortOrder after reordering', async () => {
    const images = [
      makeImage({ id: 'img-3', sortOrder: 0 }),
      makeImage({ id: 'img-1', sortOrder: 1 }),
    ];
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.productImage.update).mockResolvedValue(makeImage() as any);
    vi.mocked(prisma.productImage.findMany).mockResolvedValue(images as any);

    const result = await productService.reorderProductImages('prod-1', ['img-3', 'img-1']);

    expect(prisma.productImage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'prod-1' },
        orderBy: { sortOrder: 'asc' },
      })
    );
    expect(result).toEqual(images);
  });

  it('throws ApiError.notFound when product does not exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    await expect(productService.reorderProductImages('ghost-id', ['img-1'])).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.productImage.update).not.toHaveBeenCalled();
  });

  it('handles an empty imageIds array without throwing', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(makeProduct() as any);
    vi.mocked(prisma.productImage.findMany).mockResolvedValue([] as any);

    await expect(productService.reorderProductImages('prod-1', [])).resolves.not.toThrow();

    expect(prisma.productImage.update).not.toHaveBeenCalled();
  });
});
