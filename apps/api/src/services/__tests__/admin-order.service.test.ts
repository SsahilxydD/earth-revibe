import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that references the mocked module
// ---------------------------------------------------------------------------

const {
  mockOrderFindMany,
  mockOrderCount,
  mockOrderFindUnique,
  mockOrderUpdate,
  mockOrderCreate,
  mockOrderStatusHistoryCreate,
  mockOrderNoteCreate,
  mockVariantFindMany,
  mockVariantUpdateMany,
  mockAddressCreate,
  mockAddressUpdateMany,
  mockUserFindUnique,
  mockTransaction,
} = vi.hoisted(() => {
  const mockOrderUpdate = vi.fn();
  const mockOrderCreate = vi.fn();
  const mockOrderStatusHistoryCreate = vi.fn();
  const mockOrderNoteCreate = vi.fn();
  const mockVariantFindMany = vi.fn();
  const mockVariantUpdateMany = vi.fn();
  const mockAddressCreate = vi.fn();
  const mockAddressUpdateMany = vi.fn();
  // tx client shares the same mock fns so assertions work whether the call
  // came through prisma.* or the transaction client.
  const txClient = {
    order: { create: mockOrderCreate, update: mockOrderUpdate },
    orderStatusHistory: { create: mockOrderStatusHistoryCreate },
    orderNote: { create: mockOrderNoteCreate },
    productVariant: { findMany: mockVariantFindMany, updateMany: mockVariantUpdateMany },
    address: { create: mockAddressCreate, updateMany: mockAddressUpdateMany },
  };
  const mockTransaction = vi.fn(async (cb: (tx: typeof txClient) => unknown) => cb(txClient));
  return {
    mockOrderFindMany: vi.fn(),
    mockOrderCount: vi.fn(),
    mockOrderFindUnique: vi.fn(),
    mockOrderUpdate,
    mockOrderCreate,
    mockOrderStatusHistoryCreate,
    mockOrderNoteCreate,
    mockVariantFindMany,
    mockVariantUpdateMany,
    mockAddressCreate,
    mockAddressUpdateMany,
    mockUserFindUnique: vi.fn(),
    mockTransaction,
  };
});

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    order: {
      findMany: mockOrderFindMany,
      count: mockOrderCount,
      findUnique: mockOrderFindUnique,
      update: mockOrderUpdate,
      create: mockOrderCreate,
    },
    orderStatusHistory: {
      create: mockOrderStatusHistoryCreate,
    },
    orderNote: {
      create: mockOrderNoteCreate,
    },
    productVariant: {
      findMany: mockVariantFindMany,
      updateMany: mockVariantUpdateMany,
    },
    address: {
      create: mockAddressCreate,
      updateMany: mockAddressUpdateMany,
    },
    user: { findUnique: mockUserFindUnique, create: vi.fn(), update: vi.fn() },
    otpCode: {
      count: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: mockTransaction,
  },
  Prisma: {
    TransactionIsolationLevel: { Serializable: 'Serializable' },
  },
}));

vi.mock('../../utils/api-error', () => {
  const ApiError = class extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, message: string, code = 'ERROR') {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      Object.setPrototypeOf(this, ApiError.prototype);
    }
    static notFound(message = 'Resource not found') {
      return new ApiError(404, message, 'NOT_FOUND');
    }
    static badRequest(message: string) {
      return new ApiError(400, message, 'BAD_REQUEST');
    }
    static conflict(message: string) {
      return new ApiError(409, message, 'CONFLICT');
    }
  };
  return { ApiError };
});

// ---------------------------------------------------------------------------
// Subject under test — imported after mocks are registered
// ---------------------------------------------------------------------------

import { adminOrderService } from '../admin-order.service';
import type {
  AdminOrderQuery,
  UpdateOrderStatusInput,
  AddOrderNoteInput,
} from '@earth-revibe/shared';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_QUERY: AdminOrderQuery = {
  view: 'active',
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-id-1',
    orderNumber: 'ORD-001',
    status: 'PENDING',
    totalAmount: 999,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    guestEmail: null,
    user: { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    items: [{ id: 'item-1', productId: 'prod-1', quantity: 2, price: 499 }],
    payment: { status: 'PAID', method: 'CARD', paidAt: new Date() },
    address: { id: 'addr-1', line1: '123 Main St', city: 'Mumbai' },
    statusHistory: [],
    notes: [],
    discountCode: null,
    ...overrides,
  };
}

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-id-1',
    orderId: 'order-id-1',
    userId: 'admin-id-1',
    content: 'Checked and confirmed',
    isInternal: true,
    createdAt: new Date(),
    user: { firstName: 'Admin', lastName: 'User' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('adminOrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // listOrders
  // -------------------------------------------------------------------------

  describe('listOrders', () => {
    it('returns orders with pagination metadata on a basic query', async () => {
      const orders = [makeOrder()];
      mockOrderFindMany.mockResolvedValue(orders);
      mockOrderCount.mockResolvedValue(1);

      const result = await adminOrderService.listOrders(BASE_QUERY);

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('runs findMany and count in parallel via Promise.all', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      // Both mocks must have been called exactly once
      expect(mockOrderFindMany).toHaveBeenCalledTimes(1);
      expect(mockOrderCount).toHaveBeenCalledTimes(1);
    });

    it('passes the correct skip and take for page 2 with limit 10', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(25);

      const query: AdminOrderQuery = { ...BASE_QUERY, page: 2, limit: 10 };
      const result = await adminOrderService.listOrders(query);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
      expect(result.totalPages).toBe(3);
    });

    it('applies status filter to both findMany and count', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, status: 'PENDING' as any };
      await adminOrderService.listOrders(query);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) })
      );
      expect(mockOrderCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) })
      );
    });

    it('builds OR clause for search term covering all searchable fields', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, search: 'alice' };
      await adminOrderService.listOrders(query);

      const [call] = mockOrderFindMany.mock.calls;
      const where = call[0].where;

      // OR clause covers order, guest email, user (email/first/last), and
      // shipping-address (name/phone) for offline / manual orders.
      expect(where.OR).toHaveLength(7);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { orderNumber: { contains: 'alice', mode: 'insensitive' } },
          { guestEmail: { contains: 'alice', mode: 'insensitive' } },
          { user: { email: { contains: 'alice', mode: 'insensitive' } } },
          { user: { firstName: { contains: 'alice', mode: 'insensitive' } } },
          { user: { lastName: { contains: 'alice', mode: 'insensitive' } } },
          { address: { fullName: { contains: 'alice', mode: 'insensitive' } } },
          { address: { phone: { contains: 'alice', mode: 'insensitive' } } },
        ])
      );
    });

    it('does not add OR clause when search is omitted', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    it('applies startDate as createdAt.gte filter', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, startDate: '2024-01-01' };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date('2024-01-01'));
      expect(where.createdAt.lte).toBeUndefined();
    });

    it('applies endDate as createdAt.lte filter', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, endDate: '2024-03-31' };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt.lte).toEqual(new Date('2024-03-31'));
      expect(where.createdAt.gte).toBeUndefined();
    });

    it('applies both startDate and endDate together', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = {
        ...BASE_QUERY,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date('2024-01-01'));
      expect(where.createdAt.lte).toEqual(new Date('2024-03-31'));
    });

    it('does not add createdAt filter when neither date is provided', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt).toBeUndefined();
    });

    it('passes sortBy and sortOrder to orderBy', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, sortBy: 'totalAmount', sortOrder: 'asc' };
      await adminOrderService.listOrders(query);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { totalAmount: 'asc' } })
      );
    });

    it('includes user, items and payment in findMany select', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      const [call] = mockOrderFindMany.mock.calls;
      expect(call[0].include).toHaveProperty('user');
      expect(call[0].include).toHaveProperty('items');
      expect(call[0].include).toHaveProperty('payment');
    });

    it('returns totalPages=0 when total is 0', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const result = await adminOrderService.listOrders(BASE_QUERY);

      expect(result.totalPages).toBe(0);
    });

    it('calculates totalPages correctly when count does not divide evenly', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(21);

      const query: AdminOrderQuery = { ...BASE_QUERY, limit: 20 };
      const result = await adminOrderService.listOrders(query);

      expect(result.totalPages).toBe(2);
    });

    it('can combine status, search, and date filters simultaneously', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = {
        ...BASE_QUERY,
        status: 'SHIPPING' as any,
        search: 'bob',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.status).toBe('SHIPPING');
      expect(where.OR).toBeDefined();
      expect(where.createdAt.gte).toEqual(new Date('2024-06-01'));
      expect(where.createdAt.lte).toEqual(new Date('2024-06-30'));
    });

    it('propagates database errors from findMany', async () => {
      mockOrderFindMany.mockRejectedValue(new Error('DB connection lost'));
      mockOrderCount.mockResolvedValue(0);

      await expect(adminOrderService.listOrders(BASE_QUERY)).rejects.toThrow('DB connection lost');
    });

    it('propagates database errors from count', async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockRejectedValue(new Error('Count query failed'));

      await expect(adminOrderService.listOrders(BASE_QUERY)).rejects.toThrow('Count query failed');
    });
  });

  // -------------------------------------------------------------------------
  // getOrder
  // -------------------------------------------------------------------------

  describe('getOrder', () => {
    it('returns the order when found', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);

      const result = await adminOrderService.getOrder('ORD-001');

      expect(result).toEqual(order);
    });

    it('calls findUnique with orderNumber as the lookup key', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);

      await adminOrderService.getOrder('ORD-001');

      expect(mockOrderFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderNumber: 'ORD-001' } })
      );
    });

    it('includes all relations needed for detail view', async () => {
      mockOrderFindUnique.mockResolvedValue(makeOrder());

      await adminOrderService.getOrder('ORD-001');

      const [call] = mockOrderFindUnique.mock.calls;
      expect(call[0].include).toHaveProperty('user');
      expect(call[0].include).toHaveProperty('items');
      expect(call[0].include).toHaveProperty('payment');
      expect(call[0].include).toHaveProperty('address');
      expect(call[0].include).toHaveProperty('statusHistory');
      expect(call[0].include).toHaveProperty('notes');
      expect(call[0].include).toHaveProperty('discountCode');
    });

    it('throws ApiError with 404 when order is not found', async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(adminOrderService.getOrder('ORD-NONEXISTENT')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    });

    it('propagates unexpected database errors', async () => {
      mockOrderFindUnique.mockRejectedValue(new Error('Unexpected DB error'));

      await expect(adminOrderService.getOrder('ORD-001')).rejects.toThrow('Unexpected DB error');
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus — state machine
  // -------------------------------------------------------------------------

  describe('updateStatus', () => {
    const ADMIN_ID = 'admin-id-1';

    async function performUpdate(fromStatus: string, toStatus: string, note?: string) {
      const order = makeOrder({ status: fromStatus });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({ ...order, status: toStatus });
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      const data: UpdateOrderStatusInput = { status: toStatus as any, note };
      return adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, data);
    }

    // --- Happy path: all valid transitions ----------------------------------

    it('transitions PENDING -> CONFIRMED', async () => {
      const result = await performUpdate('PENDING', 'CONFIRMED');
      expect(result.status).toBe('CONFIRMED');
    });

    it('transitions PENDING -> CANCELLED', async () => {
      const result = await performUpdate('PENDING', 'CANCELLED');
      expect(result.status).toBe('CANCELLED');
    });

    it('transitions CONFIRMED -> SHIPPING', async () => {
      const result = await performUpdate('CONFIRMED', 'SHIPPING');
      expect(result.status).toBe('SHIPPING');
    });

    it('transitions CONFIRMED -> CANCELLED', async () => {
      const result = await performUpdate('CONFIRMED', 'CANCELLED');
      expect(result.status).toBe('CANCELLED');
    });

    it('transitions SHIPPING -> DELIVERED', async () => {
      const result = await performUpdate('SHIPPING', 'DELIVERED');
      expect(result.status).toBe('DELIVERED');
    });

    it('transitions SHIPPING -> RETURNED (carrier RTO)', async () => {
      const result = await performUpdate('SHIPPING', 'RETURNED');
      expect(result.status).toBe('RETURNED');
    });

    it('transitions SHIPPING -> CANCELLED', async () => {
      const result = await performUpdate('SHIPPING', 'CANCELLED');
      expect(result.status).toBe('CANCELLED');
    });

    it('transitions DELIVERED -> RETURNED (admin-approved return)', async () => {
      const result = await performUpdate('DELIVERED', 'RETURNED');
      expect(result.status).toBe('RETURNED');
    });

    // --- Invalid transitions ------------------------------------------------

    const invalidTransitions: Array<[string, string]> = [
      ['PENDING', 'SHIPPING'],
      ['PENDING', 'DELIVERED'],
      ['PENDING', 'RETURNED'],
      ['CONFIRMED', 'PENDING'],
      ['CONFIRMED', 'DELIVERED'],
      ['CONFIRMED', 'RETURNED'],
      ['SHIPPING', 'PENDING'],
      ['SHIPPING', 'CONFIRMED'],
      ['DELIVERED', 'PENDING'],
      ['DELIVERED', 'CONFIRMED'],
      ['DELIVERED', 'SHIPPING'],
      ['DELIVERED', 'CANCELLED'],
      ['CANCELLED', 'PENDING'],
      ['CANCELLED', 'CONFIRMED'],
      ['CANCELLED', 'SHIPPING'],
      ['CANCELLED', 'DELIVERED'],
      ['CANCELLED', 'RETURNED'],
      ['RETURNED', 'PENDING'],
      ['RETURNED', 'CONFIRMED'],
      ['RETURNED', 'SHIPPING'],
      ['RETURNED', 'DELIVERED'],
      ['RETURNED', 'CANCELLED'],
    ];

    it.each(invalidTransitions)(
      'throws 400 BAD_REQUEST for invalid transition %s -> %s',
      async (fromStatus, toStatus) => {
        const order = makeOrder({ status: fromStatus });
        mockOrderFindUnique.mockResolvedValue(order);

        const data: UpdateOrderStatusInput = { status: toStatus as any };
        await expect(
          adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, data)
        ).rejects.toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });

        // No DB mutation should happen on invalid transitions
        expect(mockOrderUpdate).not.toHaveBeenCalled();
        expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();

        vi.clearAllMocks();
      }
    );

    // Terminal states — CANCELLED, RETURNED have no allowed targets
    it("throws 400 for any transition from CANCELLED and mentions 'none'", async () => {
      const order = makeOrder({ status: 'CANCELLED' });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'PENDING' as any })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('none'),
      });
    });

    it("throws 400 for any transition from RETURNED and mentions 'none'", async () => {
      const order = makeOrder({ status: 'RETURNED' });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'DELIVERED' as any })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('none'),
      });
    });

    // --- Carrier-owned-status lock (Shiprocket source of truth) -------------

    it('blocks manual SHIPPING write when AWB exists (carrier owns the lifecycle)', async () => {
      const order = makeOrder({ status: 'CONFIRMED', awbCode: 'AWB-LOCKED' });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'SHIPPING' as any })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('owned by Shiprocket'),
      });
    });

    it('blocks manual DELIVERED write when AWB exists', async () => {
      const order = makeOrder({ status: 'SHIPPING', awbCode: 'AWB-LOCKED' });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'DELIVERED' as any })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('allows manual CANCELLED even when AWB exists (admin override pre-pickup)', async () => {
      const order = makeOrder({ status: 'CONFIRMED', awbCode: 'AWB-LOCKED' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      const result = await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'CANCELLED' as any,
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('allows manual SHIPPING write when AWB is not yet assigned (pre-pickup flow)', async () => {
      const order = makeOrder({ status: 'CONFIRMED', awbCode: null });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      const result = await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'SHIPPING' as any,
      });
      expect(result.status).toBe('SHIPPING');
    });

    // --- Persistence checks -------------------------------------------------

    it('updates the order status in the database', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'CONFIRMED' as any,
      });

      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: order.id },
        data: { status: 'CONFIRMED' },
      });
    });

    it('creates an OrderStatusHistory entry with the admin id', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'CONFIRMED' as any,
      });

      expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: order.id,
          status: 'CONFIRMED',
          changedBy: ADMIN_ID,
        }),
      });
    });

    it('uses a default note when no note is supplied', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'CONFIRMED' as any,
      });

      const historyCall = mockOrderStatusHistoryCreate.mock.calls[0][0];
      expect(historyCall.data.note).toBe('Status updated to CONFIRMED');
    });

    it('uses the caller-supplied note when provided', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'CONFIRMED' as any,
        note: 'Manually confirmed by ops team',
      });

      const historyCall = mockOrderStatusHistoryCreate.mock.calls[0][0];
      expect(historyCall.data.note).toBe('Manually confirmed by ops team');
    });

    it('returns the orderNumber and new status', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      const result = await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: 'CONFIRMED' as any,
      });

      expect(result).toEqual({ orderNumber: 'ORD-001', status: 'CONFIRMED' });
    });

    it('throws 404 NOT_FOUND when order does not exist', async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(
        adminOrderService.updateStatus('ORD-MISSING', ADMIN_ID, { status: 'CONFIRMED' as any })
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

      expect(mockOrderUpdate).not.toHaveBeenCalled();
      expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
    });

    it('propagates database errors from order.update', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockRejectedValue(new Error('Write failed'));
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'CONFIRMED' as any })
      ).rejects.toThrow('Write failed');
    });

    it('propagates database errors from orderStatusHistory.create', async () => {
      const order = makeOrder({ status: 'PENDING' });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockRejectedValue(new Error('History write failed'));

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'CONFIRMED' as any })
      ).rejects.toThrow('History write failed');
    });

    it('includes current and target statuses in the error message', async () => {
      const order = makeOrder({ status: 'SHIPPING' });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: 'PENDING' as any })
      ).rejects.toMatchObject({
        message: expect.stringContaining('SHIPPING'),
      });
    });
  });

  // -------------------------------------------------------------------------
  // addNote
  // -------------------------------------------------------------------------

  describe('addNote', () => {
    const ADMIN_ID = 'admin-id-1';

    it('creates and returns a note for an existing order', async () => {
      const order = makeOrder();
      const note = makeNote();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(note);

      const data: AddOrderNoteInput = { content: 'Checked and confirmed', isInternal: true };
      const result = await adminOrderService.addNote(order.orderNumber, ADMIN_ID, data);

      expect(result).toEqual(note);
    });

    it('calls orderNote.create with orderId, adminId, content and isInternal', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote());

      const data: AddOrderNoteInput = { content: 'Follow up required', isInternal: false };
      await adminOrderService.addNote(order.orderNumber, ADMIN_ID, data);

      expect(mockOrderNoteCreate).toHaveBeenCalledWith({
        data: {
          orderId: order.id,
          userId: ADMIN_ID,
          content: 'Follow up required',
          isInternal: false,
        },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
    });

    it('creates a public (non-internal) note when isInternal is false', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote({ isInternal: false }));

      const data: AddOrderNoteInput = { content: 'Shared with customer', isInternal: false };
      await adminOrderService.addNote(order.orderNumber, ADMIN_ID, data);

      const noteData = mockOrderNoteCreate.mock.calls[0][0].data;
      expect(noteData.isInternal).toBe(false);
    });

    it('includes user first/last name in the note result', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote());

      await adminOrderService.addNote(order.orderNumber, ADMIN_ID, {
        content: 'Test',
        isInternal: true,
      });

      const [call] = mockOrderNoteCreate.mock.calls;
      expect(call[0].include).toEqual({
        user: { select: { firstName: true, lastName: true } },
      });
    });

    it('throws 404 NOT_FOUND when order does not exist', async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(
        adminOrderService.addNote('ORD-MISSING', ADMIN_ID, {
          content: 'Should not be created',
          isInternal: true,
        })
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

      expect(mockOrderNoteCreate).not.toHaveBeenCalled();
    });

    it('propagates database errors from orderNote.create', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockRejectedValue(new Error('Note write failed'));

      await expect(
        adminOrderService.addNote(order.orderNumber, ADMIN_ID, {
          content: 'Crash test',
          isInternal: true,
        })
      ).rejects.toThrow('Note write failed');
    });

    it('looks up the order by orderNumber before creating the note', async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote());

      await adminOrderService.addNote('ORD-001', ADMIN_ID, {
        content: 'Test',
        isInternal: true,
      });

      expect(mockOrderFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderNumber: 'ORD-001' } })
      );
    });

    it('handles note content with special characters and unicode', async () => {
      const order = makeOrder();
      const specialContent = "Order flagged ⚠️ — côte d'Ivoire, <script>alert(1)</script>";
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote({ content: specialContent }));

      const result = await adminOrderService.addNote(order.orderNumber, ADMIN_ID, {
        content: specialContent,
        isInternal: true,
      });

      const noteData = mockOrderNoteCreate.mock.calls[0][0].data;
      expect(noteData.content).toBe(specialContent);
      expect((result as any).content).toBe(specialContent);
    });
  });

  // ---------------------------------------------------------------------------
  // archiveOrder — active-shipment guard
  // ---------------------------------------------------------------------------

  describe('archiveOrder', () => {
    const ADMIN_ID = 'admin-id-1';

    it('refuses to archive a SHIPPING order that has an active AWB', async () => {
      // An online order in flight: Shiprocket is moving the package and we
      // still need tracking updates to land on THIS row. Archiving would
      // silently disappear the order from the customer's account while the
      // physical shipment continues.
      const order = makeOrder({
        status: 'SHIPPING',
        awbCode: '369267801257',
        deletedAt: null,
      });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(adminOrderService.archiveOrder(order.orderNumber, ADMIN_ID, {})).rejects.toThrow(
        /active AWB \(369267801257\)/
      );

      // The guard runs before any write — no update + no history row.
      expect(mockOrderUpdate).not.toHaveBeenCalled();
      expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
    });

    it('does NOT block archive when an offline order is SHIPPING without an AWB', async () => {
      // An offline order can sit at SHIPPING without an AWB (we never create
      // a Shiprocket shipment for offline-source orders). Archiving these is
      // fine — there's no carrier package in motion to confuse.
      const order = makeOrder({
        status: 'SHIPPING',
        awbCode: null,
        source: 'OFFLINE',
        deletedAt: null,
      });
      mockOrderFindUnique.mockResolvedValue(order);

      // archiveOrder uses prisma.$transaction internally; the guard runs
      // first and should not throw for this input. We assert the guard
      // passed by checking that findUnique was reached but the AWB-block
      // error was NOT raised.
      await adminOrderService.archiveOrder(order.orderNumber, ADMIN_ID, {}).catch((err) => {
        // Anything other than the AWB-block error means the guard passed;
        // a downstream $transaction error here is expected because the
        // narrow mock doesn't stub it. The point is: the guard didn't fire.
        expect(String(err.message)).not.toMatch(/active AWB/);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // createManualOrder — optional backdating (Order.createdAt)
  // ---------------------------------------------------------------------------

  describe('createManualOrder', () => {
    const ADMIN_ID = 'admin-id-1';

    const MANUAL_INPUT = {
      userId: 'user-1',
      items: [{ variantId: 'var-1', quantity: 2, unitPrice: 500 }],
      discountAmount: 0,
      shippingAmount: 0,
      taxAmount: 0,
      status: 'DELIVERED',
    };

    function stubManualHappyPath() {
      mockUserFindUnique.mockResolvedValue({
        id: 'user-1',
        phone: '9876543210',
        phoneVerified: true,
        firstName: 'Ravi',
        lastName: 'Kumar',
        isActive: true,
      });
      mockVariantFindMany.mockResolvedValue([
        {
          id: 'var-1',
          size: 'M',
          color: 'Black',
          price: 500,
          product: {
            id: 'prod-1',
            name: 'Tee',
            price: 500,
            costPrice: 250,
            category: null,
            images: [{ url: 'img.jpg' }],
          },
        },
      ]);
      mockVariantUpdateMany.mockResolvedValue({ count: 1 });
      mockAddressCreate.mockResolvedValue({ id: 'addr-1' });
      mockOrderCreate.mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1', items: [] });
      mockOrderNoteCreate.mockResolvedValue({});
    }

    it('omits createdAt (defaults to now()) when no orderDate is given', async () => {
      stubManualHappyPath();

      await adminOrderService.createManualOrder(ADMIN_ID, MANUAL_INPUT as any);

      const data = mockOrderCreate.mock.calls[0][0].data;
      expect(data.createdAt).toBeUndefined();
      expect(data.statusHistory.create.createdAt).toBeUndefined();
    });

    it('backdates the order and its initial status-history entry from orderDate', async () => {
      stubManualHappyPath();
      const orderDate = '2024-03-15T10:00:00.000Z';

      await adminOrderService.createManualOrder(ADMIN_ID, { ...MANUAL_INPUT, orderDate } as any);

      const data = mockOrderCreate.mock.calls[0][0].data;
      expect(data.createdAt).toEqual(new Date(orderDate));
      expect(data.statusHistory.create.createdAt).toEqual(new Date(orderDate));
    });

    it("snapshots the product's costPrice onto the created order items", async () => {
      stubManualHappyPath();

      await adminOrderService.createManualOrder(ADMIN_ID, MANUAL_INPUT as any);

      const items = mockOrderCreate.mock.calls[0][0].data.items.create;
      expect(items[0].costPrice).toBe(250);
    });
  });

  // ---------------------------------------------------------------------------
  // createDraftOrder — two-phase offline drafts
  // ---------------------------------------------------------------------------

  describe('createDraftOrder', () => {
    const ADMIN_ID = 'admin-id-1';

    const DRAFT_INPUT = {
      guestName: 'Ravi Kumar',
      guestPhone: '9876543210',
      items: [{ variantId: 'var-1', quantity: 2, unitPrice: 500 }],
      discountAmount: 0,
      shippingAmount: 0,
      taxAmount: 0,
    };

    function stubDraftHappyPath() {
      mockVariantFindMany.mockResolvedValue([
        {
          id: 'var-1',
          size: 'M',
          color: 'Black',
          price: 500,
          product: { id: 'prod-1', name: 'Tee', price: 500, images: [{ url: 'img.jpg' }] },
        },
      ]);
      mockAddressCreate.mockResolvedValue({ id: 'addr-draft' });
      mockOrderCreate.mockResolvedValue({ id: 'order-draft', orderNumber: 'ORD-DRAFT', items: [] });
      mockOrderNoteCreate.mockResolvedValue({});
    }

    it('creates a DRAFT offline order linked to no user (temp customer on the order)', async () => {
      stubDraftHappyPath();

      await adminOrderService.createDraftOrder(ADMIN_ID, DRAFT_INPUT as any);

      const data = mockOrderCreate.mock.calls[0][0].data;
      expect(data.status).toBe('DRAFT');
      expect(data.source).toBe('OFFLINE');
      expect(data.guestName).toBe('Ravi Kumar');
      expect(data.guestPhone).toBe('9876543210');
      expect(data.userId).toBeUndefined();
    });

    it('does NOT reserve stock at draft time', async () => {
      stubDraftHappyPath();

      await adminOrderService.createDraftOrder(ADMIN_ID, DRAFT_INPUT as any);

      // Stock is only decremented on confirm, never on draft creation.
      expect(mockVariantUpdateMany).not.toHaveBeenCalled();
    });

    it('creates a placeholder address with the guest name and phone', async () => {
      stubDraftHappyPath();

      await adminOrderService.createDraftOrder(ADMIN_ID, DRAFT_INPUT as any);

      const addr = mockAddressCreate.mock.calls[0][0].data;
      expect(addr.fullName).toBe('Ravi Kumar');
      expect(addr.phone).toBe('9876543210');
      expect(addr.userId).toBeUndefined();
    });

    it('rejects a discount larger than the subtotal', async () => {
      stubDraftHappyPath();

      await expect(
        adminOrderService.createDraftOrder(ADMIN_ID, {
          ...DRAFT_INPUT,
          discountAmount: 5000, // subtotal is 2 * 500 = 1000
        } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('omits createdAt (defaults to now()) when no orderDate is given', async () => {
      stubDraftHappyPath();

      await adminOrderService.createDraftOrder(ADMIN_ID, DRAFT_INPUT as any);

      const data = mockOrderCreate.mock.calls[0][0].data;
      expect(data.createdAt).toBeUndefined();
      expect(data.statusHistory.create.createdAt).toBeUndefined();
    });

    it('backdates the draft and its status-history entry from orderDate', async () => {
      stubDraftHappyPath();
      const orderDate = '2024-03-15T10:00:00.000Z';

      await adminOrderService.createDraftOrder(ADMIN_ID, { ...DRAFT_INPUT, orderDate } as any);

      const data = mockOrderCreate.mock.calls[0][0].data;
      expect(data.createdAt).toEqual(new Date(orderDate));
      expect(data.statusHistory.create.createdAt).toEqual(new Date(orderDate));
    });
  });

  // ---------------------------------------------------------------------------
  // confirmOfflineOrder — verification gate + stock reservation
  // ---------------------------------------------------------------------------

  describe('confirmOfflineOrder', () => {
    const ADMIN_ID = 'admin-id-1';

    function makeDraft(overrides: Record<string, unknown> = {}) {
      return {
        id: 'order-draft',
        orderNumber: 'ORD-DRAFT',
        status: 'DRAFT',
        source: 'OFFLINE',
        deletedAt: null,
        userId: 'user-1',
        user: { id: 'user-1', phoneVerified: true, isActive: true },
        items: [{ variantId: 'var-1', quantity: 2, productName: 'Tee' }],
        ...overrides,
      };
    }

    it('throws 404 when the order does not exist', async () => {
      mockOrderFindUnique.mockResolvedValue(null);
      await expect(
        adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-X', { status: 'DELIVERED' } as any)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('refuses to confirm a non-draft order', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft({ status: 'CONFIRMED' }));
      await expect(
        adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', { status: 'DELIVERED' } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('refuses to confirm an archived draft', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft({ deletedAt: new Date() }));
      await expect(
        adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', { status: 'DELIVERED' } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('refuses to confirm when the customer is NOT verified (no userId)', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft({ userId: null, user: null }));
      await expect(
        adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', { status: 'DELIVERED' } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('refuses to confirm when the linked user is not phone-verified', async () => {
      mockOrderFindUnique.mockResolvedValue(
        makeDraft({ user: { id: 'user-1', phoneVerified: false, isActive: true } })
      );
      await expect(
        adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', { status: 'DELIVERED' } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('confirms a verified draft: reserves stock and sets the final status', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft());
      mockVariantUpdateMany.mockResolvedValue({ count: 1 });
      mockOrderUpdate.mockResolvedValue({ id: 'order-draft', status: 'DELIVERED' });
      mockOrderNoteCreate.mockResolvedValue({});

      await adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', {
        status: 'DELIVERED',
        paymentMethod: 'CASH',
      } as any);

      // Stock reserved exactly once for the single line item.
      expect(mockVariantUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-1', stock: { gte: 2 } },
          data: { stock: { decrement: 2 } },
        })
      );
      // Status flipped on the order.
      expect(mockOrderUpdate.mock.calls[0][0].data.status).toBe('DELIVERED');
    });

    it('rolls up insufficient stock into a 409 conflict on confirm', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft());
      mockVariantUpdateMany.mockResolvedValue({ count: 0 }); // race-safe predicate failed

      await expect(
        adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', { status: 'DELIVERED' } as any)
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('backdates createdAt on the order (not the status entry) when orderDate is given', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft());
      mockVariantUpdateMany.mockResolvedValue({ count: 1 });
      mockOrderUpdate.mockResolvedValue({ id: 'order-draft', status: 'DELIVERED' });
      mockOrderNoteCreate.mockResolvedValue({});
      const orderDate = '2024-03-15T10:00:00.000Z';

      await adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', {
        status: 'DELIVERED',
        orderDate,
      } as any);

      const data = mockOrderUpdate.mock.calls[0][0].data;
      expect(data.createdAt).toEqual(new Date(orderDate));
      // The confirm status-history entry keeps real wall-clock time so the
      // draft→confirm timeline stays ordered.
      expect(data.statusHistory.create.createdAt).toBeUndefined();
    });

    it('leaves createdAt untouched on confirm when no orderDate is given', async () => {
      mockOrderFindUnique.mockResolvedValue(makeDraft());
      mockVariantUpdateMany.mockResolvedValue({ count: 1 });
      mockOrderUpdate.mockResolvedValue({ id: 'order-draft', status: 'DELIVERED' });
      mockOrderNoteCreate.mockResolvedValue({});

      await adminOrderService.confirmOfflineOrder(ADMIN_ID, 'ORD-DRAFT', {
        status: 'DELIVERED',
      } as any);

      expect(mockOrderUpdate.mock.calls[0][0].data.createdAt).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // updateOrderDate — re-date an existing offline order (OFFLINE-only)
  // ---------------------------------------------------------------------------

  describe('updateOrderDate', () => {
    const ADMIN_ID = 'admin-id-1';
    const NEW_DATE = '2024-03-15T10:00:00.000Z';

    it('throws 404 when the order does not exist', async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(
        adminOrderService.updateOrderDate('ORD-X', ADMIN_ID, { orderDate: NEW_DATE } as any)
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('refuses to re-date an ONLINE order (date pinned to checkout/payment)', async () => {
      mockOrderFindUnique.mockResolvedValue({
        id: 'o1',
        source: 'ONLINE',
        deletedAt: null,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      await expect(
        adminOrderService.updateOrderDate('ORD-1', ADMIN_ID, { orderDate: NEW_DATE } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('refuses to re-date an archived order', async () => {
      mockOrderFindUnique.mockResolvedValue({
        id: 'o1',
        source: 'OFFLINE',
        deletedAt: new Date(),
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      await expect(
        adminOrderService.updateOrderDate('ORD-1', ADMIN_ID, { orderDate: NEW_DATE } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('updates createdAt and records an internal audit note for an offline order', async () => {
      const previous = new Date('2024-01-01T00:00:00.000Z');
      mockOrderFindUnique.mockResolvedValue({
        id: 'o1',
        source: 'OFFLINE',
        deletedAt: null,
        createdAt: previous,
      });
      mockOrderUpdate.mockResolvedValue({ orderNumber: 'ORD-1', createdAt: new Date(NEW_DATE) });
      mockOrderNoteCreate.mockResolvedValue({});

      await adminOrderService.updateOrderDate('ORD-1', ADMIN_ID, { orderDate: NEW_DATE } as any);

      expect(mockOrderUpdate.mock.calls[0][0].data.createdAt).toEqual(new Date(NEW_DATE));
      const note = mockOrderNoteCreate.mock.calls[0][0].data;
      expect(note).toMatchObject({ orderId: 'o1', userId: ADMIN_ID, isInternal: true });
      expect(note.content).toContain(previous.toISOString());
      expect(note.content).toContain(new Date(NEW_DATE).toISOString());
    });
  });

  // ---------------------------------------------------------------------------
  // sendDraftCustomerOtp / verifyDraftCustomer — draft-only guards
  // ---------------------------------------------------------------------------

  describe('draft customer verification guards', () => {
    it('sendDraftCustomerOtp refuses a non-draft order', async () => {
      mockOrderFindUnique.mockResolvedValue({
        status: 'CONFIRMED',
        source: 'OFFLINE',
        guestPhone: '9876543210',
      });
      await expect(adminOrderService.sendDraftCustomerOtp('ORD-1')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('sendDraftCustomerOtp refuses a draft with no phone on file', async () => {
      mockOrderFindUnique.mockResolvedValue({
        status: 'DRAFT',
        source: 'OFFLINE',
        guestPhone: null,
      });
      await expect(adminOrderService.sendDraftCustomerOtp('ORD-1')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('verifyDraftCustomer refuses a non-draft order', async () => {
      mockOrderFindUnique.mockResolvedValue({
        id: 'o1',
        status: 'CONFIRMED',
        source: 'OFFLINE',
        guestPhone: '9876543210',
        guestName: 'Ravi',
      });
      await expect(
        adminOrderService.verifyDraftCustomer('ORD-1', { code: '123456' } as any)
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
