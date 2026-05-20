import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const {
  mockOrderFindUnique,
  mockOrderFindFirst,
  mockOrderFindMany,
  mockOrderUpdate,
  mockOrderStatusHistoryCreate,
  mockTrackingActivityUpsert,
  mockTrackingActivityFindMany,
  mockTransaction,
  mockShiprocketRequest,
  mockFetch,
} = vi.hoisted(() => ({
  mockOrderFindUnique: vi.fn(),
  mockOrderFindFirst: vi.fn(),
  mockOrderFindMany: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockOrderStatusHistoryCreate: vi.fn(),
  mockTrackingActivityUpsert: vi.fn(),
  mockTrackingActivityFindMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockShiprocketRequest: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    order: {
      findUnique: mockOrderFindUnique,
      findFirst: mockOrderFindFirst,
      findMany: mockOrderFindMany,
      update: mockOrderUpdate,
    },
    orderStatusHistory: { create: mockOrderStatusHistoryCreate },
    orderTrackingActivity: {
      upsert: mockTrackingActivityUpsert,
      findMany: mockTrackingActivityFindMany,
    },
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
  env: {
    SHIPROCKET_PICKUP_PINCODE: '110001',
    SHIPROCKET_PICKUP_LOCATION: 'Earthrevibe',
    DISCORD_ORDER_WEBHOOK_URL: undefined,
  },
}));

import { shiprocketService, isCarrierOwnedStatus } from '../shiprocket.service';

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction in the service is called with an array of prisma promises;
  // the mock resolves the array as-is — sufficient because the inner ops are
  // also mocked.
  mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  mockTrackingActivityFindMany.mockResolvedValue([]);
  // Global fetch (used for Discord notify) — stubbed so tests don't try to
  // hit the network.
  vi.stubGlobal('fetch', mockFetch);
});

const trackedOrder = {
  awbCode: 'AWB123',
  courierName: 'BlueDart',
  trackingUrl: 'https://shiprocket.co/tracking/AWB123',
  status: 'SHIPPED',
  orderNumber: 'ORD-001',
  lastShipmentSyncAt: null,
};

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
// isCarrierOwnedStatus — exported for the admin-order lock
// ─────────────────────────────────────────────────────────────────────────────
describe('isCarrierOwnedStatus', () => {
  it('identifies carrier-owned forward-flow states', () => {
    expect(isCarrierOwnedStatus('SHIPPED' as any)).toBe(true);
    expect(isCarrierOwnedStatus('OUT_FOR_DELIVERY' as any)).toBe(true);
    expect(isCarrierOwnedStatus('DELIVERED' as any)).toBe(true);
  });

  it('does not lock CANCELLED — admin can still cancel pre-pickup', () => {
    expect(isCarrierOwnedStatus('CANCELLED' as any)).toBe(false);
    expect(isCarrierOwnedStatus('PLACED' as any)).toBe(false);
    expect(isCarrierOwnedStatus('CONFIRMED' as any)).toBe(false);
    expect(isCarrierOwnedStatus('PROCESSING' as any)).toBe(false);
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
      orderNumber: 'ORD-NEW',
      lastShipmentSyncAt: null,
    });
    const result = await shiprocketService.getTracking('order-1');
    expect(result.tracked).toBe(false);
    expect(result.available).toBe(true);
    expect(result.activities).toEqual([]);
    expect(mockShiprocketRequest).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns available:false with persisted activities when Shiprocket API fails', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockRejectedValue(new Error('Shiprocket 504'));
    mockTrackingActivityFindMany.mockResolvedValue([
      {
        occurredAt: new Date('2026-05-20T10:00:00Z'),
        status: 'Shipped',
        activity: 'Picked up',
        location: 'Surat',
      },
    ]);

    const result = await shiprocketService.getTracking('order-1');

    expect(result.available).toBe(false);
    expect(result.error).toBe('shiprocket_api_failed');
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({ status: 'Shipped', location: 'Surat' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('stamps lastShipmentSyncAt even when status is unchanged', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 6,
        shipment_status: 'Shipped',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // Only the lastShipmentSyncAt update — no status change, no history row.
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
  });

  it('persists status + history + sync timestamp when Shiprocket reports a new status', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 7,
        shipment_status: 'Delivered',
        shipment_track_activities: [
          {
            date: '2026-05-20 12:00:00',
            'sr-status-label': 'Delivered',
            activity: 'Delivered to recipient',
            location: 'Bengaluru',
          },
        ],
      },
    });

    const result = await shiprocketService.getTracking('order-1');

    expect(result.available).toBe(true);
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'DELIVERED', lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: 'order-1', status: 'DELIVERED' }),
    });
    expect(mockTrackingActivityUpsert).toHaveBeenCalled();
  });

  it('persists tracking activities on every successful refresh', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 6,
        shipment_status: 'Shipped',
        shipment_track_activities: [
          {
            date: '2026-05-19 09:30:00',
            'sr-status-label': 'In Transit',
            activity: 'Reached hub',
            location: 'Mumbai',
          },
          {
            date: '2026-05-20 06:15:00',
            'sr-status-label': 'In Transit',
            activity: 'Out for delivery',
            location: 'Bengaluru',
          },
        ],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockTrackingActivityUpsert).toHaveBeenCalledTimes(2);
    const firstCall = mockTrackingActivityUpsert.mock.calls[0][0];
    expect(firstCall.create).toMatchObject({
      orderId: 'order-1',
      status: 'In Transit',
      location: 'Mumbai',
    });
  });

  it('skips activities with invalid dates instead of writing garbage', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 6,
        shipment_status: 'Shipped',
        shipment_track_activities: [
          { date: 'not-a-date', 'sr-status-label': 'Shipped', activity: '', location: '' },
          {
            date: '2026-05-20',
            'sr-status-label': 'Out for Delivery',
            activity: '',
            location: '',
          },
        ],
      },
    });

    await shiprocketService.getTracking('order-1');

    // Only the second (valid) activity gets persisted.
    expect(mockTrackingActivityUpsert).toHaveBeenCalledTimes(1);
  });

  it('does not crash when Shiprocket returns shipment_status as a number (real-world response)', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status_id: 6, shipment_status: 6, shipment_track_activities: [] },
    });

    const result = await shiprocketService.getTracking('order-1');
    expect(result.available).toBe(true);
    // SHIPPED → SHIPPED no-op, but lastShipmentSyncAt still stamped.
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
  });

  it('maps text fallback when shipment_status_id is missing', async () => {
    mockOrderFindUnique.mockResolvedValue({ ...trackedOrder, status: 'PROCESSING' });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status: 'Out for Delivery', shipment_track_activities: [] },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'OUT_FOR_DELIVERY', lastShipmentSyncAt: expect.any(Date) },
    });
  });

  it('maps Shiprocket cancellation/RTO to CANCELLED/RETURNED (carrier-driven terminal)', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 19,
        shipment_status: 'RTO Delivered',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'RETURNED', lastShipmentSyncAt: expect.any(Date) },
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
        tracking_data: {
          shipment_status_id: 7,
          shipment_status: 'Delivered',
          shipment_track_activities: [],
        },
      })
      .mockResolvedValueOnce({
        tracking_data: {
          shipment_status_id: 6,
          shipment_status: 'Shipped',
          shipment_track_activities: [],
        },
      });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 2, updated: 1, unchanged: 1, failed: 0 });
    // Both orders get a $transaction (sync stamp), but only the updated one
    // gets a status change.
    expect(mockTransaction).toHaveBeenCalledTimes(2);
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'DELIVERED', lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o2' },
      data: { lastShipmentSyncAt: expect.any(Date) },
    });
  });

  it('counts failures and keeps going when one AWB lookup throws', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'o1', orderNumber: 'ORD-1', awbCode: 'AWB1', status: 'SHIPPED' },
      { id: 'o2', orderNumber: 'ORD-2', awbCode: 'AWB2', status: 'SHIPPED' },
    ]);

    mockShiprocketRequest.mockRejectedValueOnce(new Error('Shiprocket 500')).mockResolvedValueOnce({
      tracking_data: {
        shipment_status_id: 7,
        shipment_status: 'Delivered',
        shipment_track_activities: [],
      },
    });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 2, updated: 1, unchanged: 0, failed: 1 });
  });

  it('filters to in-flight statuses', async () => {
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
// refreshByAwb (webhook handler entry point)
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.refreshByAwb', () => {
  it('returns null when AWB does not match any order in our DB', async () => {
    mockOrderFindFirst.mockResolvedValue(null);
    const result = await shiprocketService.refreshByAwb('AWB-UNKNOWN');
    expect(result).toBeNull();
    expect(mockShiprocketRequest).not.toHaveBeenCalled();
  });

  it('triggers a full sync for the matched order', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: 'SHIPPED',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 7,
        shipment_status: 'Delivered',
        shipment_track_activities: [],
      },
    });

    const result = await shiprocketService.refreshByAwb('AWB123');

    expect(result).toEqual({ changed: true, orderId: 'order-1' });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'DELIVERED', lastShipmentSyncAt: expect.any(Date) },
    });
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
});
