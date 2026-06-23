import { z } from 'zod';
import { BlogPostStatus } from '../enums';

export const createBlogPostSchema = z.object({
  title: z.string().min(5).max(200),
  slug: z.string().min(2).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  featuredImage: z.string().url().optional(),
  status: z.nativeEnum(BlogPostStatus).default(BlogPostStatus.DRAFT),
  publishedAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

// Zod-v4 partial+default hazard (see product.schema): `.partial()` keeps
// `.default()`, so an omitted `status` is injected as DRAFT and unpublishes a
// live post on any partial edit (identical to the product-unpublish incident).
// Re-declare it as a plain optional so an omitted field stays absent.
export const updateBlogPostSchema = createBlogPostSchema.partial().extend({
  status: z.nativeEnum(BlogPostStatus).optional(),
});

export const createBlogCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
});

export const createBlogTagSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).optional(),
});

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type CreateBlogCategoryInput = z.infer<typeof createBlogCategorySchema>;
export type CreateBlogTagInput = z.infer<typeof createBlogTagSchema>;
