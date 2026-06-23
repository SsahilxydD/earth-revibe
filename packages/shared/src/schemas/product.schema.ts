import { z } from 'zod';
import { ProductStatus, VIBES } from '../enums';

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).optional(),
  description: z.string().min(10),
  shortDescription: z.string().max(500).optional(),
  price: z.coerce.number().positive(),
  compareAtPrice: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().positive().optional()
  ),
  // Unit cost of goods, used for gross-profit analytics. Optional; may be 0.
  costPrice: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  material: z.string().optional(),
  careInstructions: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.string().max(200).optional(),
  returnsInfo: z.string().optional(),
  shippingInfo: z.string().optional(),
  origin: z.string().optional(),
  composition: z.string().optional(),
  measurements: z.string().optional(),
  fabricWeight: z.string().optional(),
  fit: z.string().optional(),
  printType: z.string().optional(),
  washInstructions: z.string().optional(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  isFeatured: z.boolean().default(false),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).optional(),
  vibes: z.array(z.enum(VIBES)).default([]),
});

// Update payloads are partial — only the fields actually sent should change.
// CAUTION (Zod v4): `.partial()` makes fields optional but does NOT strip
// `.default()`, so an omitted defaulted field is still filled with its default
// at parse time. That silently rewrote real data — a cost-price-only save came
// out of the parser as { costPrice, status: 'DRAFT', isFeatured: false, vibes: [] }
// and unpublished the product. Re-declare every defaulted field as a plain
// optional (no default) so an omitted field stays absent and is never written.
export const updateProductSchema = createProductSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
  isFeatured: z.boolean().optional(),
  vibes: z.array(z.enum(VIBES)).optional(),
});

export const productQuerySchema = z.object({
  category: z.preprocess(
    (v) => (typeof v === 'string' && v.includes(',') ? v.split(',').filter(Boolean) : v),
    z.union([z.string(), z.array(z.string())]).optional()
  ),
  // Bulk-fetch by slug — used by Flight Mode to pull the curated combo
  // products (multiple categories at once) without falling back to the
  // vibe filter, which can't enforce category mix.
  slugs: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
    z.array(z.string()).optional()
  ),
  vibe: z.enum(VIBES).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  isFeatured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['price', 'createdAt', 'name', 'reviewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const productVariantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().min(1),
  color: z.string().default(''),
  colorHex: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a 6-digit hex color, e.g. #FF0000')
      .optional()
  ),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  barcode: z.string().optional(),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.enum(['g', 'kg', 'lb', 'oz']).default('g'),
  isActive: z.boolean().default(true),
});

// Same Zod-v4 partial+default hazard as updateProductSchema: a partial variant
// update must not reset omitted defaulted fields (notably stock→0). Re-declare
// each defaulted field as a plain optional so omitted fields are never written.
export const updateProductVariantSchema = productVariantSchema.partial().extend({
  color: z.string().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  weightUnit: z.enum(['g', 'kg', 'lb', 'oz']).optional(),
  isActive: z.boolean().optional(),
});

export const addProductImageSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  publicId: z.string().min(1),
  altText: z.string().max(500).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
