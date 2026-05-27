import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ReviewProductsParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'pendingCount' | 'reviewCount' | 'avgRating' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductReviewsParams {
  status?: 'all' | 'approved' | 'pending';
  page?: number;
  limit?: number;
}

export interface ReviewProductRow {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  images: { url: string }[];
  reviewCount: number;
  pendingCount: number;
  avgRating: number | null;
}

export interface ReviewProductsResponse {
  items: ReviewProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string };
}

export interface ProductReviewsResponse {
  product: { id: string; name: string; slug: string; status: string };
  reviews: ReviewRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    reviewCount: number;
    approvedCount: number;
    pendingCount: number;
    avgRating: number | null;
  };
}

function qs(params: object) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  }
  return sp.toString();
}

export function useReviewProducts(params: ReviewProductsParams = {}) {
  return useQuery({
    queryKey: ['admin-review-products', params],
    queryFn: () => api.get<ReviewProductsResponse>(`/admin/reviews/products?${qs(params)}`),
  });
}

export function useProductReviews(productId: string, params: ProductReviewsParams = {}) {
  return useQuery({
    queryKey: ['admin-product-reviews', productId, params],
    queryFn: () =>
      api.get<ProductReviewsResponse>(`/admin/reviews/products/${productId}?${qs(params)}`),
    enabled: !!productId,
  });
}

export function useUpdateReviewApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      api.patch(`/admin/reviews/${id}/approval`, { isApproved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-reviews'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product-reviews'] });
    },
  });
}
