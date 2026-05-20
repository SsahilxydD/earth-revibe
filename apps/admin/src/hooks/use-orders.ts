import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { revalidateStorefront } from '@/lib/revalidate-storefront';
import type {
  OrderListParams,
  CreateManualOrderInput,
  SendCustomerOtpInput,
  VerifyCustomerOtpInput,
} from '@/types';

type SendCustomerOtpResult = { isExistingCustomer: boolean; hasName: boolean };
type VerifyCustomerOtpResult = {
  userId: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  email: string;
  isNewCustomer: boolean;
};

export function useOrders(params: OrderListParams = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => api.get(`/admin/orders?${searchParams.toString()}`),
  });
}

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: ['admin-order', orderNumber],
    queryFn: () => api.get(`/admin/orders/${orderNumber}`),
    enabled: !!orderNumber,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderNumber,
      status,
      note,
    }: {
      orderNumber: string;
      status: string;
      note?: string;
    }) => api.put(`/admin/orders/${orderNumber}/status`, { status, note }),
    onMutate: async ({ orderNumber, status }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['admin-order', orderNumber] });

      // Snapshot the previous value for rollback
      const previousOrder = queryClient.getQueryData(['admin-order', orderNumber]);

      // Optimistically patch the cached order status
      queryClient.setQueryData(['admin-order', orderNumber], (old: any) => {
        if (!old?.order) return old;
        return {
          ...old,
          order: { ...old.order, status },
        };
      });

      return { previousOrder, orderNumber };
    },
    onError: (_err, _variables, context) => {
      // Roll back to the snapshot on failure
      if (context?.previousOrder !== undefined) {
        queryClient.setQueryData(['admin-order', context.orderNumber], context.previousOrder);
      }
    },
    onSettled: (_data, _err, { orderNumber }) => {
      // Always sync the server truth after mutation settles
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useAddOrderNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderNumber,
      content,
      isInternal,
    }: {
      orderNumber: string;
      content: string;
      isInternal?: boolean;
    }) => api.post(`/admin/orders/${orderNumber}/notes`, { content, isInternal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    },
  });
}

// Shiprocket fulfillment hooks
export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => api.post(`/shipping/${orderNumber}/create-shipment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useAssignAWB() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderNumber,
      courierCompanyId,
    }: {
      orderNumber: string;
      courierCompanyId?: number;
    }) =>
      api.post(`/shipping/${orderNumber}/assign-awb`, courierCompanyId ? { courierCompanyId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    },
  });
}

export function useGenerateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => api.post(`/shipping/${orderNumber}/label`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    },
  });
}

export function useGenerateManifest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => api.post(`/shipping/${orderNumber}/manifest`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
    },
  });
}

export function useOrderTracking(orderNumber: string) {
  return useQuery({
    queryKey: ['order-tracking', orderNumber],
    queryFn: () => api.get(`/shipping/track/${orderNumber}`),
    enabled: !!orderNumber,
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderNumber,
      amount,
      reason,
    }: {
      orderNumber: string;
      amount?: number;
      reason: string;
    }) => api.post(`/admin/orders/${orderNumber}/refund`, { amount, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

// ---- Manual / offline orders + archive ----

/** Send a WhatsApp OTP to a customer's phone before creating a manual order. */
export function useSendCustomerOtp() {
  return useMutation<SendCustomerOtpResult, Error, SendCustomerOtpInput>({
    mutationFn: (data) => api.post('/admin/orders/manual/send-otp', data),
  });
}

/** Verify the customer's OTP — creates/finds the User and returns userId. */
export function useVerifyCustomerOtp() {
  return useMutation<VerifyCustomerOtpResult, Error, VerifyCustomerOtpInput>({
    mutationFn: (data) => api.post('/admin/orders/manual/verify-otp', data),
  });
}

/** Create a manual offline order (in-person sale entered by an admin). */
export function useCreateManualOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateManualOrderInput) => api.post('/admin/orders/manual', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      // Stock changed → storefront product pages may show new availability.
      revalidateStorefront(['products']);
    },
  });
}

/** Soft-delete (archive) an order. Distinct from cancelling. */
export function useArchiveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, reason }: { orderNumber: string; reason?: string }) =>
      api.delete(`/admin/orders/${orderNumber}`, reason ? { reason } : {}),
    onSuccess: (_data, { orderNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Restore a previously archived order. */
export function useRestoreOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => api.post(`/admin/orders/${orderNumber}/restore`),
    onSuccess: (_data, orderNumber) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
