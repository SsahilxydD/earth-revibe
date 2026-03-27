import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate-storefront';

export function useCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories'),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      revalidateStorefront(['categories']);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      revalidateStorefront(['categories']);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      revalidateStorefront(['categories']);
    },
  });
}

/** Add products to a category via join table (products stay in their original category too) */
export function useAddProductsToCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, productIds }: { categoryId: string; productIds: string[] }) =>
      api.post(`/categories/${categoryId}/products`, { productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      revalidateStorefront(['categories', 'products']);
    },
  });
}

/** Remove products from a category (join table only) */
export function useRemoveProductsFromCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, productIds }: { categoryId: string; productIds: string[] }) =>
      api.delete(`/categories/${categoryId}/products`, { productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      revalidateStorefront(['categories', 'products']);
    },
  });
}

/** Get product IDs assigned to a category (via join table) */
export function useCategoryProductIds(categoryId: string) {
  return useQuery({
    queryKey: ['admin-category-products', categoryId],
    queryFn: () => api.get(`/categories/${categoryId}/products`),
    enabled: !!categoryId,
  });
}
