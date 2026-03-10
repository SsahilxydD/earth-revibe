import { z } from "zod";
import { ProductStatus } from "../enums";

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).optional(),
  description: z.string().min(10),
  shortDescription: z.string().max(500).optional(),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().optional(),
  material: z.string().optional(),
  careInstructions: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  productDetails: z.string().optional(),
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
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  category: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  search: z.string().optional(),
  isFeatured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["price", "createdAt", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const productVariantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  price: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
