import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useOrders(params: OrderListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () => api.get(`/admin/orders?${searchParams.toString()}`),
  });
}

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: ["admin-order", orderNumber],
    queryFn: () => api.get(`/admin/orders/${orderNumber}`),
    enabled: !!orderNumber,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, status, note }: { orderNumber: string; status: string; note?: string }) =>
      api.put(`/admin/orders/${orderNumber}/status`, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
    },
  });
}

export function useAddOrderNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, content, isInternal }: { orderNumber: string; content: string; isInternal?: boolean }) =>
      api.post(`/admin/orders/${orderNumber}/notes`, { content, isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
    },
  });
}

// Shiprocket fulfillment hooks
export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) =>
      api.post(`/shipping/${orderNumber}/create-shipment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useAssignAWB() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, courierCompanyId }: { orderNumber: string; courierCompanyId?: number }) =>
      api.post(`/shipping/${orderNumber}/assign-awb`, courierCompanyId ? { courierCompanyId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
    },
  });
}

export function useGenerateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) =>
      api.post(`/shipping/${orderNumber}/label`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
    },
  });
}

export function useGenerateManifest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) =>
      api.post(`/shipping/${orderNumber}/manifest`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
    },
  });
}

export function useOrderTracking(orderNumber: string) {
  return useQuery({
    queryKey: ["order-tracking", orderNumber],
    queryFn: () => api.get(`/shipping/track/${orderNumber}`),
    enabled: !!orderNumber,
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, amount, reason }: { orderNumber: string; amount?: number; reason: string }) =>
      api.post(`/admin/orders/${orderNumber}/refund`, { amount, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}
