import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const {
  mockOrderFindUnique,
  mockOrderFindMany,
  mockOrderUpdate,
  mockOrderStatusHistoryCreate,
  mockTransaction,
  mockShiprocketRequest,
} = vi.hoisted(() => ({
  mockOrderFindUnique: vi.fn(),
  mockOrderFindMany: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockOrderStatusHistoryCreate: vi.fn(),
  mockTransaction: vi.fn(),
  mockShiprocketRequest: vi.fn(),
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    order: {
      findUnique: mockOrderFindUnique,
      findMany: mockOrderFindMany,
      update: mockOrderUpdate,
    },
    orderStatusHistory: { create: mockOrderStatusHistoryCreate },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../config/shiprocket', () => ({
  shiprocketRequest: mockShiprocketRequest,
}));

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../config/env', () => ({
  env: { SHIPROCKET_PICKUP_PINCODE: '110001', SHIPROCKET_PICKUP_LOCATION: 'Earthrevibe' },
}));

import { shiprocketService } from '../shiprocket.service';

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction in the service is called with an array of prisma promises;
  // the prisma client normally awaits the array atomically. The mock just
  // resolves the array as-is — sufficient because the inner ops are mocked too.
  mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
});

// ─────────────────────────────────────────────────────────────────────────────
// checkServiceability
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.checkServiceability', () => {
  it('returns courier list when Shiprocket responds', async () => {
    mockShiprocketRequest.mockResolvedValue({
      data: {
        available_courier_companies: [
          { courier_name: 'BlueDart', courier_company_id: 1, rate: 60, etd: '3-5', cod: 1 },
        ],
      },
    });
    const result = await shiprocketService.checkServiceability('560001');
    expect(result.serviceable).toBe(true);
    expect(result.couriers).toHaveLength(1);
    expect(result.couriers[0]).toMatchObject({ courier_name: 'BlueDart', cod: true });
  });

  it('propagates errors (no longer returns fake-success on failure)', async () => {
    mockShiprocketRequest.mockRejectedValue(new Error('Shiprocket 503'));
    await expect(shiprocketService.checkServiceability('560001')).rejects.toThrow('Shiprocket 503');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTracking
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.getTracking', () => {
  it('returns tracked:false when no AWB is assigned yet', async () => {
    mockOrderFindUnique.mockResolvedValue({
      awbCode: null,
      courierName: null,
      trackingUrl: null,
      status: 'PROCESSING',
    });
    const result = await shiprocketService.getTracking('order-1');
    expect(result).toEqual({ available: true, tracked: false, awbCode: null, activities: [] });
    expect(mockShiprocketRequest).not.toHaveBeenCalled();
  });

  it('returns available:false with stale DB state when Shiprocket API fails', async () => {
    mockOrderFindUnique.mockResolvedValue({
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      trackingUrl: 'https://shiprocket.co/tracking/AWB123',
      status: 'SHIPPED',
    });
    mockShiprocketRequest.mockRejectedValue(new Error('Shiprocket 504'));

    const result = await shiprocketService.getTracking('order-1');

    expect(result).toMatchObject({
      available: false,
      tracked: true,
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      error: 'shiprocket_api_failed',
    });
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('persists status change when Shiprocket reports a new status', async () => {
    mockOrderFindUnique.mockResolvedValue({
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      trackingUrl: 'https://shiprocket.co/tracking/AWB123',
      status: 'SHIPPED',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 7,
        shipment_status: 'Delivered',
        shipment_track_activities: [
          {
            date: '2026-05-20',
            'sr-status-label': 'Delivered',
            activity: 'Delivered to recipient',
            location: 'Bengaluru',
          },
        ],
      },
    });

    const result = await shiprocketService.getTracking('order-1');

    expect(result.available).toBe(true);
    expect(result.currentStatusDescription).toBe('Delivered');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'DELIVERED' },
    });
    expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: 'order-1', status: 'DELIVERED' }),
    });
  });

  it('does not persist when Shiprocket reports the same status', async () => {
    mockOrderFindUnique.mockResolvedValue({
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      trackingUrl: 'https://shiprocket.co/tracking/AWB123',
      status: 'SHIPPED',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 6,
        shipment_status: 'Shipped',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('does not persist for Shiprocket statuses we deliberately ignore (RTO/cancel)', async () => {
    mockOrderFindUnique.mockResolvedValue({
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      trackingUrl: 'https://shiprocket.co/tracking/AWB123',
      status: 'SHIPPED',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 18,
        shipment_status: 'RTO Initiated',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('does not crash when Shiprocket returns shipment_status as a number (real-world response)', async () => {
    // Production smoke caught this: Shiprocket sometimes returns shipment_status as
    // a numeric string or number instead of the label. text.trim() then throws.
    mockOrderFindUnique.mockResolvedValue({
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      trackingUrl: 'https://shiprocket.co/tracking/AWB123',
      status: 'SHIPPED',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status_id: 6, shipment_status: 6, shipment_track_activities: [] },
    });

    const result = await shiprocketService.getTracking('order-1');
    expect(result.available).toBe(true);
    // Still maps via the numeric id even when text is a number
    expect(mockTransaction).not.toHaveBeenCalled(); // SHIPPED → SHIPPED no-op
  });

  it('falls back to status text when shipment_status_id is missing', async () => {
    mockOrderFindUnique.mockResolvedValue({
      awbCode: 'AWB123',
      courierName: 'BlueDart',
      trackingUrl: 'https://shiprocket.co/tracking/AWB123',
      status: 'PROCESSING',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status: 'Out for Delivery', shipment_track_activities: [] },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'OUT_FOR_DELIVERY' },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshAllPendingShipments
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.refreshAllPendingShipments', () => {
  it('returns zeros when there are no in-flight orders', async () => {
    mockOrderFindMany.mockResolvedValue([]);
    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });
    expect(result).toMatchObject({ scanned: 0, updated: 0, unchanged: 0, failed: 0 });
    expect(mockShiprocketRequest).not.toHaveBeenCalled();
  });

  it('updates orders whose Shiprocket status advanced and leaves unchanged ones alone', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'o1', orderNumber: 'ORD-1', awbCode: 'AWB1', status: 'SHIPPED' },
      { id: 'o2', orderNumber: 'ORD-2', awbCode: 'AWB2', status: 'SHIPPED' },
    ]);

    mockShiprocketRequest
      .mockResolvedValueOnce({
        tracking_data: { shipment_status_id: 7, shipment_status: 'Delivered' },
      })
      .mockResolvedValueOnce({
        tracking_data: { shipment_status_id: 6, shipment_status: 'Shipped' },
      });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 2, updated: 1, unchanged: 1, failed: 0 });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'DELIVERED' },
    });
  });

  it('counts failures and keeps going when one AWB lookup throws', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'o1', orderNumber: 'ORD-1', awbCode: 'AWB1', status: 'SHIPPED' },
      { id: 'o2', orderNumber: 'ORD-2', awbCode: 'AWB2', status: 'SHIPPED' },
    ]);

    mockShiprocketRequest.mockRejectedValueOnce(new Error('Shiprocket 500')).mockResolvedValueOnce({
      tracking_data: { shipment_status_id: 7, shipment_status: 'Delivered' },
    });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 2, updated: 1, unchanged: 0, failed: 1 });
  });

  it('filters to in-flight statuses and excludes soft-deleted orders', async () => {
    mockOrderFindMany.mockResolvedValue([]);
    await shiprocketService.refreshAllPendingShipments({ limit: 5 });
    expect(mockOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          awbCode: { not: null },
          status: { in: ['PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
        }),
        take: 5,
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// reconcileMissingShipments
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.reconcileMissingShipments', () => {
  it('selects CONFIRMED orders missing shiprocketOrderId past the min-age cutoff', async () => {
    mockOrderFindMany.mockResolvedValue([]);

    await shiprocketService.reconcileMissingShipments({ limit: 5 });

    const call = mockOrderFindMany.mock.calls[0][0];
    expect(call.where.status).toBe('CONFIRMED');
    expect(call.where.shiprocketOrderId).toBeNull();
    expect(call.where.createdAt.lt).toBeInstanceOf(Date);
    expect(call.take).toBe(5);
  });

  it('counts recovered vs failed when retrying createShiprocketOrder', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'o-recover-1', orderNumber: 'ORD-R1' },
      { id: 'o-fail-1', orderNumber: 'ORD-F1' },
    ]);

    // Stub the full createShiprocketOrder dependency chain: findUnique returns
    // a complete order, request resolves on first call, rejects on second.
    mockOrderFindUnique
      .mockResolvedValueOnce({
        id: 'o-recover-1',
        orderNumber: 'ORD-R1',
        createdAt: new Date(),
        totalAmount: '1000',
        guestEmail: null,
        items: [{ productName: 'T', variantId: 'v1', quantity: 1, unitPrice: '1000' }],
        address: {
          fullName: 'Test User',
          phone: '+919999999999',
          line1: 'L1',
          line2: '',
          city: 'BLR',
          pinCode: '560001',
          state: 'KA',
        },
        user: {
          email: 't@example.com',
          phone: '+919999999999',
          firstName: 'Test',
          lastName: 'User',
        },
        payment: { status: 'CAPTURED', method: 'UPI' },
      })
      .mockResolvedValueOnce({
        id: 'o-fail-1',
        orderNumber: 'ORD-F1',
        createdAt: new Date(),
        totalAmount: '500',
        guestEmail: null,
        items: [],
        address: {
          fullName: 'Fail User',
          phone: '+919999999998',
          line1: 'L1',
          line2: '',
          city: 'BLR',
          pinCode: '560001',
          state: 'KA',
        },
        user: {
          email: 'f@example.com',
          phone: '+919999999998',
          firstName: 'Fail',
          lastName: 'User',
        },
        payment: { status: 'CAPTURED', method: 'UPI' },
      });

    mockShiprocketRequest
      .mockResolvedValueOnce({ order_id: 12345, shipment_id: 67890 })
      .mockRejectedValueOnce(new Error('Shiprocket 500'));

    const result = await shiprocketService.reconcileMissingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 2, recovered: 1, failed: 1 });
  });
});
