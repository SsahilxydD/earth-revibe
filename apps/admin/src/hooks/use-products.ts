import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface ProductListParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useProducts(params: ProductListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["admin-products", params],
    queryFn: () => api.get(`/products?${searchParams.toString()}`),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["admin-product", slug],
    queryFn: () => api.get(`/admin/products/${slug}`),
    enabled: !!slug,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useExportProductsCSV() {
  return useMutation({
    mutationFn: async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("adminAccessToken")
          : null;
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
      const res = await fetch(`${API_BASE}/admin/products/export-csv`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Failed to export CSV");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productIds: string[];
      updates: { price?: number; compareAtPrice?: number | null; status?: string };
    }) => api.put("/admin/products/bulk-update", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

export function useImportProductsCSV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (csvContent: string) =>
      api.post("/admin/products/import-csv", { csv: csvContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}

// ---- Variant Hooks ----

export function useAddProductVariants() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, variants }: { productId: string; variants: any[] }) =>
      api.post(`/products/${productId}/variants`, { variants }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useUpdateProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: any }) =>
      api.put(`/products/variants/${variantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useDeleteProductVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) =>
      api.delete(`/products/variants/${variantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

// ---- Image Hooks ----

export function useAddProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: { url: string; publicId: string; altText?: string } }) =>
      api.post(`/products/${productId}/images`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      api.delete(`/products/images/${imageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useSetProductImagePrimary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      api.put(`/products/images/${imageId}/primary`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product"] });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("adminAccessToken")
          : null;
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/upload/image`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Failed to upload image");
      }

      const json = await res.json();
      return json as { success: boolean; url: string; id: string };
    },
  });
}
