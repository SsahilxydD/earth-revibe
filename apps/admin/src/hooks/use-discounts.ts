import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "@/components/ui";
import type { DiscountListParams } from "@/types";

export function useDiscounts(params: DiscountListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["admin-discounts", params],
    queryFn: () => api.get(`/admin/discounts?${searchParams.toString()}`),
  });
}

export function useDiscount(id: string) {
  return useQuery({
    queryKey: ["admin-discount", id],
    queryFn: () => api.get(`/admin/discounts/${id}`),
    enabled: !!id,
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/admin/discounts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      toast.success("Discount code created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create discount"),
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/admin/discounts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      qc.invalidateQueries({ queryKey: ["admin-discount"] });
      toast.success("Discount code updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update discount"),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/discounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      toast.success("Discount code deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete discount"),
  });
}

export function useToggleDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/admin/discounts/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-discounts"] });
      toast.success("Discount status updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to toggle discount"),
  });
}
