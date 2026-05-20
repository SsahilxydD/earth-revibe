import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { OrderStatus } from '@earth-revibe/shared';

// Mirror the web admin's response shape so future shared layer is feasible.
export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string | number;
  subtotal: string | number;
  createdAt: string;
  guestEmail: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    productName: string;
  }>;
  payment: {
    status: string;
    method: string | null;
    paidAt: string | null;
  } | null;
}

export interface AdminOrderListResponse {
  orders: AdminOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export interface OrdersFilter {
  status?: OrderStatus;
  search?: string;
}

export function useInfiniteOrders(filter: OrdersFilter = {}) {
  return useInfiniteQuery({
    queryKey: ['admin-orders', filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(PAGE_SIZE));
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');
      if (filter.status) params.set('status', filter.status);
      if (filter.search) params.set('search', filter.search);
      return api.get<AdminOrderListResponse>(`/admin/orders?${params.toString()}`);
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
}

export interface AdminOrderDetail extends AdminOrderListItem {
  shippingAmount: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  user: AdminOrderListItem['user'] & { phone?: string | null };
  payment: {
    status: string;
    method: string | null;
    paidAt: string | null;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    amount: string | number;
  } | null;
  address: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pinCode: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    productName: string;
    productImage: string | null;
    variantSize: string;
    variantColor: string;
    unitPrice: string | number;
    totalPrice: string | number;
  }>;
  statusHistory: Array<{
    id: string;
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }>;
}

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: ['admin-order', orderNumber],
    queryFn: () => api.get<AdminOrderDetail>(`/admin/orders/${orderNumber}`),
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
      status: OrderStatus;
      note?: string;
    }) =>
      api.put<{ orderNumber: string; status: OrderStatus }>(`/admin/orders/${orderNumber}/status`, {
        status,
        note,
      }),
    onMutate: async ({ orderNumber, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-order', orderNumber] });
      const previousOrder = queryClient.getQueryData(['admin-order', orderNumber]);
      queryClient.setQueryData(['admin-order', orderNumber], (old: AdminOrderDetail | undefined) =>
        old ? { ...old, status } : old
      );
      return { previousOrder, orderNumber };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousOrder !== undefined) {
        queryClient.setQueryData(['admin-order', ctx.orderNumber], ctx.previousOrder);
      }
    },
    onSettled: (_data, _err, { orderNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderNumber] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

// Mirrors the API's VALID_TRANSITIONS state machine so the UI doesn't offer
// transitions the server will reject.
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED', 'RETURNED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
} as Record<OrderStatus, OrderStatus[]>;
