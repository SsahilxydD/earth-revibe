import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  image: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.string().url().optional()
  ),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  // Default cost of goods for products in this category (gross-profit fallback).
  costPrice: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
});

// Zod-v4 partial+default hazard (see product.schema): `.partial()` keeps
// `.default()`, so omitted `sortOrder`/`isActive` are injected (0/true) and
// overwrite real data on a partial edit — a category edit would force-activate
// it and jump it to the top of the sort order. Re-declare them as plain
// optionals so omitted fields stay absent and are never written.
export const updateCategorySchema = createCategorySchema.partial().extend({
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int(),
    })
  ),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
