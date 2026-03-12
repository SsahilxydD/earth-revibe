/**
 * Re-export all types from the canonical @/types module.
 *
 * This file exists for backward compatibility -- components that already
 * import from "@/lib/types" will continue to work. New code should import
 * directly from "@/types".
 */
export type {
  Product,
  ProductImage,
  ProductVariant,
  ProductStatus,
  Category,
  ApiError,
  Pagination,
  PaginatedResponse,
  ProductListParams,
} from '@/types';

// Legacy aliases used by existing components
export type { PaginatedResponse as ProductsResponse } from '@/types';
export type { ProductListParams as ProductFilters } from '@/types';
export type { Pagination as PaginationInfo } from '@/types';

// Re-export the Tag shape that some components use directly
export interface Tag {
  name: string;
}
