# Phase 6: Admin Orders & Customers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Shopify-style admin pages for order management (list, detail, status updates) and customer management (list, detail).

**Architecture:** Add admin-specific API endpoints for orders and customers with role-based auth. Build admin frontend pages with React Query hooks, following existing patterns from products/categories pages.

**Tech Stack:** Express 5 + Prisma (API), Next.js 16 + React 19 + TanStack Query + Zustand (Admin), Zod (shared schemas)

---

### Task 1: API — Admin Order Endpoints

**Files:**

- Create: `apps/api/src/services/admin-order.service.ts`
- Create: `apps/api/src/controllers/admin-order.controller.ts`
- Create: `apps/api/src/routes/admin-order.routes.ts`
- Modify: `apps/api/src/app.ts` (mount new router)
- Modify: `packages/shared/src/schemas/order.schema.ts` (add adminOrderQuerySchema)
- Modify: `packages/shared/src/schemas/index.ts` (already exports order.schema)

**Context:** The existing order routes (`/orders`) are customer-facing (filter by userId). Admin needs to see ALL orders, update statuses, and add notes. The `authorize` middleware from `apps/api/src/middleware/auth.ts` accepts roles: `authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)`. The `updateOrderStatusSchema` already exists in shared schemas but is not wired up. Express 5 `req.params` values are typed `string | string[]` — cast with `as string`.

**Step 1: Add adminOrderQuerySchema to shared schemas**

In `packages/shared/src/schemas/order.schema.ts`, add after `orderQuerySchema`:

```typescript
export const adminOrderQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'totalAmount', 'orderNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const addOrderNoteSchema = z.object({
  content: z.string().min(1).max(1000),
  isInternal: z.boolean().default(true),
});

export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;
export type AddOrderNoteInput = z.infer<typeof addOrderNoteSchema>;
```

**Step 2: Create admin-order.service.ts**

```typescript
import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  AddOrderNoteInput,
} from '@earth-revibe/shared';

export const adminOrderService = {
  async listOrders(query: AdminOrderQuery) {
    const { status, search, startDate, endDate, page, limit, sortBy, sortOrder } = query;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as any).gte = new Date(startDate);
      if (endDate) (where.createdAt as any).lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: true,
          payment: { select: { status: true, method: true, paidAt: true } },
        },
      }),
      prisma.order.count({ where: where as any }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(orderNumber: string) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        payment: true,
        address: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        notes: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        discountCode: { select: { code: true, type: true, value: true } },
      },
    });

    if (!order) throw ApiError.notFound('Order not found');
    return order;
  },

  async updateStatus(orderNumber: string, adminId: string, data: UpdateOrderStatusInput) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound('Order not found');

    await prisma.order.update({
      where: { id: order.id },
      data: { status: data.status },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: data.status,
        note: data.note || `Status updated to ${data.status}`,
        changedBy: adminId,
      },
    });

    return { orderNumber: order.orderNumber, status: data.status };
  },

  async addNote(orderNumber: string, adminId: string, data: AddOrderNoteInput) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw ApiError.notFound('Order not found');

    const note = await prisma.orderNote.create({
      data: {
        orderId: order.id,
        userId: adminId,
        content: data.content,
        isInternal: data.isInternal,
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return note;
  },
};
```

**Step 3: Create admin-order.controller.ts**

```typescript
import type { Request, Response } from 'express';
import { adminOrderService } from '../services/admin-order.service';

export const adminOrderController = {
  async listOrders(req: Request, res: Response) {
    const result = await adminOrderService.listOrders(req.query as any);
    res.json({ success: true, ...result });
  },

  async getOrder(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await adminOrderService.getOrder(orderNumber);
    res.json({ success: true, order });
  },

  async updateStatus(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.updateStatus(orderNumber, req.user!.id, req.body);
    res.json({ success: true, ...result });
  },

  async addNote(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const note = await adminOrderService.addNote(orderNumber, req.user!.id, req.body);
    res.json({ success: true, note });
  },
};
```

**Step 4: Create admin-order.routes.ts**

```typescript
import { Router, type IRouter } from 'express';
import { adminOrderController } from '../controllers/admin-order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/async-handler';
import {
  adminOrderQuerySchema,
  updateOrderStatusSchema,
  addOrderNoteSchema,
} from '@earth-revibe/shared';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get(
  '/',
  validate({ query: adminOrderQuerySchema }),
  asyncHandler(adminOrderController.listOrders)
);
router.get('/:orderNumber', asyncHandler(adminOrderController.getOrder));
router.put(
  '/:orderNumber/status',
  validate({ body: updateOrderStatusSchema }),
  asyncHandler(adminOrderController.updateStatus)
);
router.post(
  '/:orderNumber/notes',
  validate({ body: addOrderNoteSchema }),
  asyncHandler(adminOrderController.addNote)
);

export { router as adminOrderRouter };
```

**Step 5: Mount in app.ts**

Add import: `import { adminOrderRouter } from "./routes/admin-order.routes";`
Add route: `app.use("/api/v1/admin/orders", adminOrderRouter);`

---

### Task 2: API — Admin Customer Endpoints

**Files:**

- Create: `apps/api/src/services/admin-customer.service.ts`
- Create: `apps/api/src/controllers/admin-customer.controller.ts`
- Create: `apps/api/src/routes/admin-customer.routes.ts`
- Modify: `apps/api/src/app.ts` (mount new router)

**Context:** Need to list all customers (users with CUSTOMER role), view customer detail with their orders, and toggle active status. Follow the same `authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)` pattern.

**Step 1: Create admin-customer.service.ts**

```typescript
import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

interface CustomerQuery {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

export const adminCustomerService = {
  async listCustomers(query: CustomerQuery) {
    const { search, isActive, page, limit, sortBy, sortOrder } = query;
    const where: Record<string, unknown> = { role: 'CUSTOMER' };

    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          loyaltyPoints: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return { customers, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getCustomer(id: string) {
    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        loyaltyPoints: true,
        createdAt: true,
        lastLoginAt: true,
        addresses: true,
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payment: { select: { status: true, paidAt: true } },
          },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!customer) throw ApiError.notFound('Customer not found');
    if (customer as any) {
      // Calculate total spent
      const totalSpent = await prisma.order.aggregate({
        where: { userId: id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        _sum: { totalAmount: true },
      });
      return { ...customer, totalSpent: totalSpent._sum.totalAmount || 0 };
    }
    return customer;
  },

  async toggleActive(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('Customer not found');

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });

    return updated;
  },
};
```

**Step 2: Create admin-customer.controller.ts**

```typescript
import type { Request, Response } from 'express';
import { adminCustomerService } from '../services/admin-customer.service';

export const adminCustomerController = {
  async listCustomers(req: Request, res: Response) {
    const query = {
      search: req.query.search as string | undefined,
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as string) || 'desc',
    };
    const result = await adminCustomerService.listCustomers(query);
    res.json({ success: true, ...result });
  },

  async getCustomer(req: Request, res: Response) {
    const id = req.params.id as string;
    const customer = await adminCustomerService.getCustomer(id);
    res.json({ success: true, customer });
  },

  async toggleActive(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminCustomerService.toggleActive(id);
    res.json({ success: true, ...result });
  },
};
```

**Step 3: Create admin-customer.routes.ts**

```typescript
import { Router, type IRouter } from 'express';
import { adminCustomerController } from '../controllers/admin-customer.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '@earth-revibe/shared';

const router: IRouter = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/', asyncHandler(adminCustomerController.listCustomers));
router.get('/:id', asyncHandler(adminCustomerController.getCustomer));
router.put('/:id/toggle-active', asyncHandler(adminCustomerController.toggleActive));

export { router as adminCustomerRouter };
```

**Step 4: Mount in app.ts**

Add import: `import { adminCustomerRouter } from "./routes/admin-customer.routes";`
Add route: `app.use("/api/v1/admin/customers", adminCustomerRouter);`

---

### Task 3: Admin — Order Hooks + Orders List Page

**Files:**

- Create: `apps/admin/src/hooks/use-orders.ts`
- Create: `apps/admin/src/app/(admin)/orders/page.tsx`

**Context:** Follow the `useProducts` hook pattern. The API returns `{ success, orders, total, page, limit, totalPages }`. Orders list should look like the products list page with status filter, search, and pagination. Admin API is at `/admin/orders`. Use `OrderStatus` enum values for filter dropdown. Format prices with INR Intl.NumberFormat.

**Step 1: Create use-orders.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
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
```

**Step 2: Create orders list page**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Eye } from 'lucide-react';
import { Button, Badge, Card, Select } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/hooks/use-orders';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  PLACED: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'warning',
  SHIPPED: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
  REFUNDED: 'default',
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrders({
    page,
    limit: 20,
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Orders</h1>
        <p className="text-sm text-medium-gray mt-1">Manage and track customer orders</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
            />
            <input
              type="text"
              placeholder="Search by order #, email, or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Orders table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.orders?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Payment</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Total</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order: any) => (
                    <tr
                      key={order.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/orders/${order.orderNumber}`}
                          className="font-medium text-deep-earth hover:underline"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="text-charcoal">
                            {order.user?.firstName} {order.user?.lastName}
                          </p>
                          <p className="text-xs text-medium-gray">{order.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant[order.status] || 'default'}>
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            order.payment?.status === 'CAPTURED'
                              ? 'success'
                              : order.payment?.status === 'FAILED'
                                ? 'error'
                                : 'warning'
                          }
                        >
                          {order.payment?.status || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-charcoal">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end">
                          <Link
                            href={`/orders/${order.orderNumber}`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-dark-gray" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} orders)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
```

---

### Task 4: Admin — Order Detail Page

**Files:**

- Create: `apps/admin/src/app/(admin)/orders/[orderNumber]/page.tsx`

**Context:** Shopify-style order detail with: order info header, items table, status timeline, status update dropdown, internal notes section. Uses `use(params)` for Next.js 16 async params. Uses `useOrder(orderNumber)`, `useUpdateOrderStatus()`, `useAddOrderNote()` from hooks.

**Code:**

```tsx
'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Send } from 'lucide-react';
import { Button, Badge, Card, Select } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useOrder, useUpdateOrderStatus, useAddOrderNote } from '@/hooks/use-orders';

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  PLACED: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'warning',
  SHIPPED: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
  REFUNDED: 'default',
};

const statusFlow = [
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
];

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const { data, isLoading } = useOrder(orderNumber);
  const updateStatus = useUpdateOrderStatus();
  const addNote = useAddOrderNote();

  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const order = data?.order;

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await updateStatus.mutateAsync({
        orderNumber,
        status: newStatus,
        note: statusNote || undefined,
      });
      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      setNewStatus('');
      setStatusNote('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await addNote.mutateAsync({ orderNumber, content: noteContent, isInternal: true });
      toast.success('Note added');
      setNoteContent('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-medium-gray">Order not found</p>
        <Link href="/orders" className="text-deep-earth hover:underline mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const cancelledOrFinal = ['CANCELLED', 'RETURNED', 'REFUNDED', 'DELIVERED'].includes(
    order.status
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-charcoal">#{order.orderNumber}</h1>
            <Badge variant={statusVariant[order.status] || 'default'}>
              {order.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-sm text-medium-gray mt-1">
            {formatDateTime(order.createdAt)} &middot; {order.items.length} item
            {order.items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order items */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Items</h3>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 py-2 border-b border-light-gray last:border-0"
                >
                  <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center flex-shrink-0">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package size={20} className="text-medium-gray" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal truncate">{item.productName}</p>
                    <p className="text-xs text-medium-gray">
                      {item.variantSize} / {item.variantColor} &middot; Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-charcoal">{formatPrice(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-light-gray space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Subtotal</span>
                <span className="text-charcoal">{formatPrice(order.subtotal)}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount {order.discountCode ? `(${order.discountCode.code})` : ''}</span>
                  <span>-{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              {Number(order.shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Shipping</span>
                  <span className="text-charcoal">{formatPrice(order.shippingAmount)}</span>
                </div>
              )}
              {order.loyaltyPointsUsed > 0 && (
                <div className="flex justify-between text-success">
                  <span>Loyalty Points ({order.loyaltyPointsUsed} pts)</span>
                  <span>-{formatPrice(order.loyaltyPointsUsed)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-light-gray">
                <span className="text-charcoal">Total</span>
                <span className="text-charcoal">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Status Timeline */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Status History</h3>
            <div className="space-y-4">
              {order.statusHistory?.map((entry: any, i: number) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${i === 0 ? 'bg-deep-earth' : 'bg-light-gray'}`}
                    />
                    {i < order.statusHistory.length - 1 && (
                      <div className="w-0.5 flex-1 bg-light-gray mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[entry.status] || 'default'}>
                        {entry.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-medium-gray">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    {entry.note && <p className="text-sm text-dark-gray mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Internal Notes</h3>
            <div className="space-y-3 mb-4">
              {order.notes?.length === 0 && (
                <p className="text-sm text-medium-gray">No notes yet</p>
              )}
              {order.notes?.map((note: any) => (
                <div key={note.id} className="p-3 bg-off-white rounded-lg">
                  <p className="text-sm text-charcoal">{note.content}</p>
                  <p className="text-xs text-medium-gray mt-1">
                    {note.user?.firstName} {note.user?.lastName} &middot;{' '}
                    {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add an internal note..."
                className="flex-1 px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteContent.trim() || addNote.isPending}
              >
                <Send size={14} />
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Update Status */}
          {!cancelledOrFinal && (
            <Card>
              <h3 className="text-base font-semibold text-charcoal mb-4">Update Status</h3>
              <div className="space-y-3">
                <Select
                  options={[{ value: '', label: 'Select new status' }, ...statusFlow]}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                />
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updateStatus.isPending}
                  className="w-full"
                >
                  Update Status
                </Button>
              </div>
            </Card>
          )}

          {/* Customer info */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Customer</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-charcoal">
                {order.user?.firstName} {order.user?.lastName}
              </p>
              <p className="text-medium-gray">{order.user?.email}</p>
              {order.user?.phone && <p className="text-medium-gray">{order.user.phone}</p>}
              <Link
                href={`/customers/${order.user?.id}`}
                className="text-deep-earth hover:underline text-xs inline-block mt-1"
              >
                View customer
              </Link>
            </div>
          </Card>

          {/* Shipping address */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Shipping Address</h3>
            {order.address ? (
              <div className="text-sm text-dark-gray space-y-1">
                <p className="font-medium text-charcoal">{order.address.fullName}</p>
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>
                  {order.address.city}, {order.address.state} {order.address.pinCode}
                </p>
                <p>{order.address.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-medium-gray">No address</p>
            )}
          </Card>

          {/* Payment info */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Payment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-medium-gray">Status</span>
                <Badge
                  variant={
                    order.payment?.status === 'CAPTURED'
                      ? 'success'
                      : order.payment?.status === 'FAILED'
                        ? 'error'
                        : 'warning'
                  }
                >
                  {order.payment?.status || 'N/A'}
                </Badge>
              </div>
              {order.payment?.method && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Method</span>
                  <span className="text-charcoal">{order.payment.method}</span>
                </div>
              )}
              {order.payment?.paidAt && (
                <div className="flex justify-between">
                  <span className="text-medium-gray">Paid at</span>
                  <span className="text-charcoal">{formatDateTime(order.payment.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 5: Admin — Customer Hooks + Customers List Page

**Files:**

- Create: `apps/admin/src/hooks/use-customers.ts`
- Create: `apps/admin/src/app/(admin)/customers/page.tsx`

**Context:** Follow same patterns. Admin API at `/admin/customers`. Show name, email, orders count, loyalty points, status. Include search and active/inactive filter.

**Step 1: Create use-customers.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

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
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ['admin-customers', params],
    queryFn: () => api.get(`/admin/customers?${searchParams.toString()}`),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => api.get(`/admin/customers/${id}`),
    enabled: !!id,
  });
}

export function useToggleCustomerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/admin/customers/${id}/toggle-active`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer'] });
    },
  });
}
```

**Step 2: Create customers list page**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Eye, UserCheck, UserX } from 'lucide-react';
import { Button, Badge, Card, Select } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useCustomers, useToggleCustomerActive } from '@/hooks/use-customers';

const activeOptions = [
  { value: '', label: 'All Customers' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCustomers({
    page,
    limit: 20,
    search: search || undefined,
    isActive: isActive || undefined,
  });
  const toggleActive = useToggleCustomerActive();

  const handleToggle = async (id: string, name: string, currentActive: boolean) => {
    const action = currentActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${name}"?`)) return;
    try {
      await toggleActive.mutateAsync(id);
      toast.success(`Customer ${action}d`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} customer`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Customers</h1>
        <p className="text-sm text-medium-gray mt-1">View and manage customer accounts</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
            />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={activeOptions}
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Customers table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.customers?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No customers found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Customer</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Email</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Orders</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Loyalty Pts
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Joined</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((customer: any) => (
                    <tr
                      key={customer.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium text-charcoal hover:text-deep-earth"
                        >
                          {customer.firstName} {customer.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">{customer.email}</td>
                      <td className="px-6 py-3 text-charcoal">{customer._count?.orders || 0}</td>
                      <td className="px-6 py-3 text-charcoal">{customer.loyaltyPoints}</td>
                      <td className="px-6 py-3 text-dark-gray">{formatDate(customer.createdAt)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={customer.isActive ? 'success' : 'error'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="View"
                          >
                            <Eye size={16} className="text-dark-gray" />
                          </Link>
                          <button
                            onClick={() =>
                              handleToggle(
                                customer.id,
                                `${customer.firstName} ${customer.lastName}`,
                                customer.isActive
                              )
                            }
                            className={`p-1.5 rounded-md transition-colors ${customer.isActive ? 'hover:bg-error/10' : 'hover:bg-success/10'}`}
                            title={customer.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {customer.isActive ? (
                              <UserX size={16} className="text-error" />
                            ) : (
                              <UserCheck size={16} className="text-success" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} customers)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
```

---

### Task 6: Admin — Customer Detail Page

**Files:**

- Create: `apps/admin/src/app/(admin)/customers/[id]/page.tsx`

**Context:** Uses `use(params)` for Next.js 16 async params. Shows customer info, stats, recent orders, addresses. Uses `useCustomer(id)` and `useToggleCustomerActive()`.

**Code:**

```tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, Star, UserCheck, UserX } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useCustomer, useToggleCustomerActive } from '@/hooks/use-customers';

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  PLACED: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'warning',
  SHIPPED: 'warning',
  OUT_FOR_DELIVERY: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'error',
  RETURNED: 'error',
  REFUNDED: 'default',
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useCustomer(id);
  const toggleActive = useToggleCustomerActive();

  const customer = data?.customer;

  const handleToggle = async () => {
    if (!customer) return;
    const action = customer.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this customer?`)) return;
    try {
      await toggleActive.mutateAsync(id);
      toast.success(`Customer ${action}d`);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} customer`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-medium-gray">Customer not found</p>
        <Link href="/customers" className="text-deep-earth hover:underline mt-2 inline-block">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customers" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-charcoal">
              {customer.firstName} {customer.lastName}
            </h1>
            <Badge variant={customer.isActive ? 'success' : 'error'}>
              {customer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-medium-gray mt-1">
            Customer since {formatDate(customer.createdAt)}
          </p>
        </div>
        <Button
          variant={customer.isActive ? 'danger' : 'secondary'}
          onClick={handleToggle}
          disabled={toggleActive.isPending}
        >
          {customer.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
          {customer.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <ShoppingBag size={20} className="text-info" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-charcoal">
                    {customer._count?.orders || 0}
                  </p>
                  <p className="text-xs text-medium-gray">Total Orders</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <span className="text-success font-semibold text-sm">&#8377;</span>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-charcoal">
                    {formatPrice(customer.totalSpent || 0)}
                  </p>
                  <p className="text-xs text-medium-gray">Total Spent</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Star size={20} className="text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-charcoal">{customer.loyaltyPoints}</p>
                  <p className="text-xs text-medium-gray">Loyalty Points</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent orders */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Recent Orders</h3>
            {!customer.orders?.length ? (
              <p className="text-sm text-medium-gray">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-gray">
                      <th className="text-left pb-2 font-medium text-medium-gray">Order</th>
                      <th className="text-left pb-2 font-medium text-medium-gray">Date</th>
                      <th className="text-left pb-2 font-medium text-medium-gray">Status</th>
                      <th className="text-right pb-2 font-medium text-medium-gray">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order: any) => (
                      <tr key={order.id} className="border-b border-light-gray last:border-0">
                        <td className="py-2">
                          <Link
                            href={`/orders/${order.orderNumber}`}
                            className="text-deep-earth hover:underline"
                          >
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 text-dark-gray">{formatDate(order.createdAt)}</td>
                        <td className="py-2">
                          <Badge variant={statusVariant[order.status] || 'default'}>
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-medium text-charcoal">
                          {formatPrice(order.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-medium-gray" />
                <span className="text-dark-gray">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-medium-gray" />
                  <span className="text-dark-gray">{customer.phone}</span>
                </div>
              )}
              <div className="pt-2 border-t border-light-gray">
                <p className="text-xs text-medium-gray">
                  Email {customer.emailVerified ? 'verified' : 'not verified'}
                </p>
                {customer.lastLoginAt && (
                  <p className="text-xs text-medium-gray mt-1">
                    Last login: {formatDate(customer.lastLoginAt)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Addresses */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Addresses ({customer.addresses?.length || 0})
            </h3>
            {!customer.addresses?.length ? (
              <p className="text-sm text-medium-gray">No addresses</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((addr: any) => (
                  <div key={addr.id} className="p-3 bg-off-white rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={12} className="text-medium-gray" />
                      <span className="font-medium text-charcoal">{addr.label}</span>
                      {addr.isDefault && <Badge variant="info">Default</Badge>}
                    </div>
                    <p className="text-dark-gray">{addr.fullName}</p>
                    <p className="text-dark-gray">{addr.line1}</p>
                    {addr.line2 && <p className="text-dark-gray">{addr.line2}</p>}
                    <p className="text-dark-gray">
                      {addr.city}, {addr.state} {addr.pinCode}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 7: Verify Build

Run `pnpm turbo build` from the repo root. All 3 apps must build successfully.
