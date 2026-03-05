import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useCustomers(params: CustomerListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["admin-customers", params],
    queryFn: () => api.get(`/admin/customers?${searchParams.toString()}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => api.get(`/admin/customers/${id}`),
    enabled: !!id,
  });
}

export function useToggleCustomerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/admin/customers/${id}/toggle-active`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customer"] });
    },
  });
}
