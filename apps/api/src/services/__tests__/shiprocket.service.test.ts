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
  mockPaymentUpdateMany,
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
  mockPaymentUpdateMany: vi.fn(),
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
  // $transaction is called two ways here:
  //  1. the status-sync stamp passes an ARRAY of prisma promises — resolve as-is
  //     (the inner ops are mocked).
  //  2. the on-DELIVERED cashback award passes a CALLBACK — awardOrderPoints.
  //     This suite is about status sync, not loyalty, so we run the callback
  //     with a tx whose order.findUnique returns null: awardOrderPoints then
  //     short-circuits to 0 (no loyalty writes, no throw). It still counts as a
  //     real $transaction call, which is what the delivered-order test asserts.
  mockTransaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)({
        order: { findUnique: vi.fn().mockResolvedValue(null) },
        payment: { updateMany: mockPaymentUpdateMany },
      });
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  mockPaymentUpdateMany.mockResolvedValue({ count: 0 });
  mockTrackingActivityFindMany.mockResolvedValue([]);
  // Global fetch (used for Discord notify) — stubbed so tests don't try to
  // hit the network.
  vi.stubGlobal('fetch', mockFetch);
});

const trackedOrder = {
  awbCode: 'AWB123',
  courierName: 'BlueDart',
  trackingUrl: 'https://shiprocket.co/tracking/AWB123',
  status: 'SHIPPING',
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
    expect(isCarrierOwnedStatus('SHIPPING' as any)).toBe(true);
    expect(isCarrierOwnedStatus('DELIVERED' as any)).toBe(true);
  });

  it('does not lock pre-pickup or terminal-cancel statuses', () => {
    expect(isCarrierOwnedStatus('CANCELLED' as any)).toBe(false);
    expect(isCarrierOwnedStatus('PENDING' as any)).toBe(false);
    expect(isCarrierOwnedStatus('CONFIRMED' as any)).toBe(false);
    expect(isCarrierOwnedStatus('RETURNED' as any)).toBe(false);
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
      status: 'PENDING',
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
      data: {
        status: 'DELIVERED',
        deliveredAt: expect.any(Date),
        lastShipmentSyncAt: expect.any(Date),
      },
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
    // Carrier reports "Out for Delivery" via text; in the six-status model
    // this collapses to SHIPPING (still in flight, not yet delivered).
    mockOrderFindUnique.mockResolvedValue({ ...trackedOrder, status: 'CONFIRMED' });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status: 'Out for Delivery', shipment_track_activities: [] },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'SHIPPING', lastShipmentSyncAt: expect.any(Date) },
    });
  });

  it('reads shipment_track[0].current_status, NOT the stale top-level shipment_status (real-prod bug)', async () => {
    // Reproduced from production: AWB 369342447516. Shiprocket left the top-level
    // shipment_status at "Shipped"/6 for hours after delivery; the canonical
    // current status lived in shipment_track[0].current_status_id = 7. Reading
    // the wrong field made every sweep silently call it "unchanged".
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 6, // stale top-level says SHIPPED
        shipment_status: 'Shipped',
        shipment_track: [
          { current_status_id: 7, current_status: 'Delivered' }, // truth
        ],
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: 'DELIVERED',
        deliveredAt: expect.any(Date),
        lastShipmentSyncAt: expect.any(Date),
      },
    });
  });

  it('falls back to most-recent activity sr-status-label when shipment_track is missing', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        // No shipment_track and the top-level fields lie or are absent.
        shipment_status_id: 6,
        shipment_status: 'Shipped',
        shipment_track_activities: [
          {
            date: '2026-05-16 12:00:00',
            'sr-status-label': 'PICKED UP',
            activity: '',
            location: '',
          },
          {
            date: '2026-05-20 13:20:00',
            'sr-status-label': 'Delivered',
            activity: '',
            location: '',
          },
        ],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        status: 'DELIVERED',
        deliveredAt: expect.any(Date),
        lastShipmentSyncAt: expect.any(Date),
      },
    });
  });

  it('maps Shiprocket cancellation/RTO to CANCELLED/RETURNED (carrier-driven terminal)', async () => {
    mockOrderFindUnique.mockResolvedValue(trackedOrder);
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        // Shiprocket code 10 = "RTO Delivered" (back to seller → RETURNED).
        shipment_status_id: 10,
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

  it('treats "Out For Pickup" (status 19) as a non-terminal pickup-phase state — NOT cancelled/returned', async () => {
    // Regression: Shiprocket code 19 is "Out For Pickup" (courier en route to
    // collect), not "RTO Delivered". It was wrongly mapped to RETURNED, which
    // renders as the same red error badge as CANCELLED on the admin. A
    // CONFIRMED order awaiting pickup must stay CONFIRMED — no status flip, no
    // history row — and keep getting swept until it actually ships.
    mockOrderFindUnique.mockResolvedValue({ ...trackedOrder, status: 'CONFIRMED' });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 19,
        shipment_status: 'Out For Pickup',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    // Only the sync timestamp is touched — no `status` key at all.
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
  });

  it('treats "Pickup Error" (status 13) as recoverable — NOT cancelled', async () => {
    // Regression: code 13 is "Pickup Error" (Shiprocket retries pickup), not
    // "Lost". It must not flip a CONFIRMED order to the terminal CANCELLED state.
    mockOrderFindUnique.mockResolvedValue({ ...trackedOrder, status: 'CONFIRMED' });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 13,
        shipment_status: 'Pickup Error',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.getTracking('order-1');

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshAllPendingShipments
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.refreshAllPendingShipments (order-first)', () => {
  const inflight = (over = {}) => ({
    id: 'o1',
    orderNumber: 'ORD-1',
    awbCode: 'AWB1',
    shiprocketOrderId: 111,
    courierName: 'Delhivery Surface',
    status: 'SHIPPING',
    ...over,
  });

  it('returns zeros when there are no in-flight orders', async () => {
    mockOrderFindMany.mockResolvedValue([]);
    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });
    expect(result).toMatchObject({
      scanned: 0,
      updated: 0,
      unchanged: 0,
      failed: 0,
      detached: 0,
      reassigned: 0,
    });
    expect(mockShiprocketRequest).not.toHaveBeenCalled();
  });

  it('selects in-flight orders by SR order id (AWB no longer gates the sweep)', async () => {
    mockOrderFindMany.mockResolvedValue([]);
    await shiprocketService.refreshAllPendingShipments({ limit: 5 });
    expect(mockOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shiprocketOrderId: { not: null },
          status: { in: ['CONFIRMED', 'SHIPPING'] },
        }),
        take: 5,
      })
    );
  });

  it('marks DELIVERED from the order-level status via /orders/show', async () => {
    mockOrderFindMany.mockResolvedValue([inflight()]);
    mockShiprocketRequest
      // /orders/show — order-level truth, same AWB as ours
      .mockResolvedValueOnce({
        data: {
          status: 'DELIVERED',
          shipments: [{ awb: 'AWB1', courier_name: 'Delhivery Surface' }],
        },
      })
      // /courier/track — activities enrichment
      .mockResolvedValueOnce({ tracking_data: { shipment_track_activities: [] } });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 1, updated: 1, failed: 0, reassigned: 0 });
    expect(mockShiprocketRequest).toHaveBeenNthCalledWith(1, '/orders/show/111');
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: {
        status: 'DELIVERED',
        deliveredAt: expect.any(Date),
        lastShipmentSyncAt: expect.any(Date),
      },
    });
  });

  it('re-adopts a reassigned AWB with a history note before syncing status', async () => {
    mockOrderFindMany.mockResolvedValue([inflight()]);
    mockShiprocketRequest
      .mockResolvedValueOnce({
        data: {
          status: 'DELIVERED',
          shipments: [{ awb: 'AWB-NEW', courier_name: 'Amazon Shipping Surface 1kg' }],
        },
      })
      .mockResolvedValueOnce({ tracking_data: { shipment_track_activities: [] } });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 1, updated: 1, reassigned: 1 });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { awbCode: 'AWB-NEW', courierName: 'Amazon Shipping Surface 1kg' },
    });
    expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'o1',
        note: expect.stringContaining('reassigned (AWB1 → AWB-NEW)'),
      }),
    });
    // Activities enrichment must use the NEW awb
    expect(mockShiprocketRequest).toHaveBeenNthCalledWith(2, '/courier/track/awb/AWB-NEW');
  });

  it('detaches when the SR order itself is canceled (order-level text)', async () => {
    mockOrderFindMany.mockResolvedValue([inflight({ status: 'CONFIRMED' })]);
    mockShiprocketRequest.mockResolvedValueOnce({
      data: { status: 'CANCELED', shipments: [{ awb: 'AWB1' }] },
    });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 1, updated: 1, failed: 0 });
    // detach keeps the SR order id — only the shipment fields clear
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: {
        awbCode: null,
        courierName: null,
        lastShipmentSyncAt: expect.any(Date),
      },
    });
  });

  it('does not re-detach an already-detached order on later sweeps', async () => {
    mockOrderFindMany.mockResolvedValue([
      inflight({ awbCode: null, courierName: null, status: 'CONFIRMED' }),
    ]);
    mockShiprocketRequest.mockResolvedValueOnce({ data: { status: 'CANCELED', shipments: [] } });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 1, unchanged: 1 });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
  });

  it('counts failures and keeps going when one /orders/show throws', async () => {
    mockOrderFindMany.mockResolvedValue([
      inflight(),
      inflight({ id: 'o2', orderNumber: 'ORD-2', shiprocketOrderId: 222, awbCode: 'AWB2' }),
    ]);
    mockShiprocketRequest
      .mockRejectedValueOnce(new Error('Shiprocket 500'))
      .mockResolvedValueOnce({
        data: { status: 'DELIVERED', shipments: [{ awb: 'AWB2', courier_name: 'X' }] },
      })
      .mockResolvedValueOnce({ tracking_data: { shipment_track_activities: [] } });

    const result = await shiprocketService.refreshAllPendingShipments({ limit: 10 });

    expect(result).toMatchObject({ scanned: 2, updated: 1, unchanged: 0, failed: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// reconcileMissingAwbs (backfill)
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.reconcileMissingAwbs', () => {
  it('selects orders with shiprocketOrderId but null awbCode', async () => {
    mockOrderFindMany.mockResolvedValue([]);
    await shiprocketService.reconcileMissingAwbs({ limit: 20 });
    const call = mockOrderFindMany.mock.calls[0][0];
    expect(call.where.shiprocketOrderId).toEqual({ not: null });
    expect(call.where.awbCode).toBeNull();
    expect(call.where.status.in).toEqual(['CONFIRMED', 'SHIPPING', 'DELIVERED']);
    expect(call.take).toBe(20);
  });

  it('backfills awbCode + status when Shiprocket /orders/show returns the assigned AWB', async () => {
    mockOrderFindMany.mockResolvedValue([
      {
        id: 'o-stale',
        orderNumber: 'ER-STALE',
        shiprocketOrderId: 12345,
        status: 'SHIPPING',
      },
    ]);
    mockShiprocketRequest.mockResolvedValue({
      data: {
        id: 12345,
        status: 'Delivered',
        status_code: 7,
        shipments: [{ id: 99, awb: '369342447516', courier_name: 'BlueDart', status: 'Delivered' }],
      },
    });

    const result = await shiprocketService.reconcileMissingAwbs({ limit: 10 });

    expect(result).toMatchObject({ scanned: 1, backfilled: 1, still_missing: 0, failed: 0 });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o-stale' },
      data: expect.objectContaining({
        awbCode: '369342447516',
        courierName: 'BlueDart',
        trackingUrl: 'https://shiprocket.co/tracking/369342447516',
        lastShipmentSyncAt: expect.any(Date),
        status: 'DELIVERED',
      }),
    });
    expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ orderId: 'o-stale', status: 'DELIVERED' }),
    });
  });

  it('counts still_missing when Shiprocket has no AWB assigned yet', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'o-pending', orderNumber: 'ER-PENDING', shiprocketOrderId: 99, status: 'CONFIRMED' },
    ]);
    mockShiprocketRequest.mockResolvedValue({
      data: { id: 99, status: 'NEW', shipments: [] },
    });

    const result = await shiprocketService.reconcileMissingAwbs({ limit: 10 });

    expect(result).toMatchObject({ scanned: 1, backfilled: 0, still_missing: 1, failed: 0 });
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('counts failures and keeps going when one order errors', async () => {
    mockOrderFindMany.mockResolvedValue([
      { id: 'o1', orderNumber: 'ER-1', shiprocketOrderId: 1, status: 'SHIPPING' },
      { id: 'o2', orderNumber: 'ER-2', shiprocketOrderId: 2, status: 'SHIPPING' },
    ]);
    mockShiprocketRequest.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({
      data: { shipments: [{ awb: 'AWB-B', courier_name: 'Delhivery' }] },
    });

    const result = await shiprocketService.reconcileMissingAwbs({ limit: 10 });
    expect(result).toMatchObject({ scanned: 2, backfilled: 1, still_missing: 0, failed: 1 });
  });

  it('handles the historical assign-awb response shape (data nested under .response.data)', async () => {
    // Smoke check of extractAwbFromAssignResponse via the assignAWB path —
    // covered here because reconcile and assign share the helper family.
    mockOrderFindUnique.mockResolvedValue({ shiprocketShipmentId: 12345 });
    mockShiprocketRequest.mockResolvedValue({
      response: { data: { awb_code: '111122223333', courier_name: 'BlueDart' } },
    });

    const r = await shiprocketService.assignAWB('o-1');

    expect(r).toEqual({ awbCode: '111122223333', courierName: 'BlueDart' });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'o-1' },
      data: expect.objectContaining({
        awbCode: '111122223333',
        courierName: 'BlueDart',
        trackingUrl: 'https://shiprocket.co/tracking/111122223333',
      }),
    });
  });

  it('handles assign-awb response when awb_code is at the top level (real-world variant)', async () => {
    mockOrderFindUnique.mockResolvedValue({ shiprocketShipmentId: 12345 });
    mockShiprocketRequest.mockResolvedValue({
      awb_code: 'TOP-LEVEL-AWB',
      courier_name: 'Delhivery',
    });

    const r = await shiprocketService.assignAWB('o-1');

    expect(r.awbCode).toBe('TOP-LEVEL-AWB');
  });

  it('THROWS when assign-awb response has no extractable awb_code (no more silent failures)', async () => {
    mockOrderFindUnique.mockResolvedValue({ shiprocketShipmentId: 12345 });
    mockShiprocketRequest.mockResolvedValue({
      response: 'AWB Assignment Failed', // string instead of object — historical silent-fail trigger
    });

    await expect(shiprocketService.assignAWB('o-1')).rejects.toThrow('unrecognised');
    expect(mockOrderUpdate).not.toHaveBeenCalled();
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
      status: 'SHIPPING',
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
      data: {
        status: 'DELIVERED',
        deliveredAt: expect.any(Date),
        lastShipmentSyncAt: expect.any(Date),
      },
    });
  });

  it('settles a pending COD payment when the carrier reports Delivered', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: 'SHIPPING',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 7,
        shipment_status: 'Delivered',
        shipment_track_activities: [],
      },
    });

    await shiprocketService.refreshByAwb('AWB123');

    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1', status: 'PENDING' },
      data: { status: 'CAPTURED', paidAt: expect.any(Date) },
    });
  });

  it('detaches the shipment instead of cancelling the order on Shiprocket Cancelled', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-2',
      orderNumber: 'ORD-2',
      status: 'SHIPPING',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 8,
        shipment_status: 'Canceled',
        shipment_track_activities: [],
      },
    });

    const result = await shiprocketService.refreshByAwb('AWB456');

    expect(result).toEqual({ changed: true, orderId: 'order-2' });
    // Shipment fields cleared, order.status untouched
    // detach keeps shiprocketOrderId — it's the durable identity the
    // order-first sweep uses to re-adopt reassigned AWBs
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-2' },
      data: {
        awbCode: null,
        courierName: null,
        lastShipmentSyncAt: expect.any(Date),
      },
    });
    const updateData = mockOrderUpdate.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('status');
    // Audit row keeps the CURRENT status and explains the detach
    expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-2',
        status: 'SHIPPING',
        note: expect.stringContaining('detached'),
      }),
    });
    // No loyalty/settlement transaction fires for a detach
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });

  it('detaches the shipment when Shiprocket rejects the AWB as cancelled (API error)', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-4',
      orderNumber: 'ORD-4',
      status: 'CONFIRMED',
    });
    mockShiprocketRequest.mockRejectedValue(new Error('Ohh! This AWB has been cancelled.'));

    const result = await shiprocketService.refreshByAwb('AWB-DEAD');

    expect(result).toEqual({ changed: true, orderId: 'order-4' });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-4' },
      data: {
        awbCode: null,
        courierName: null,
        lastShipmentSyncAt: expect.any(Date),
      },
    });
    expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-4',
        status: 'CONFIRMED',
        note: expect.stringContaining('AWB cancelled'),
      }),
    });
  });

  it('only stamps lastShipmentSyncAt when an already-CANCELLED order reports Cancelled', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 'order-3',
      orderNumber: 'ORD-3',
      status: 'CANCELLED',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: {
        shipment_status_id: 8,
        shipment_status: 'Canceled',
        shipment_track_activities: [],
      },
    });

    const result = await shiprocketService.refreshByAwb('AWB789');

    expect(result).toEqual({ changed: false, orderId: 'order-3' });
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-3' },
      data: { lastShipmentSyncAt: expect.any(Date) },
    });
    expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSyncState (ops diagnostic)
// ─────────────────────────────────────────────────────────────────────────────
describe('shiprocketService.getSyncState', () => {
  const baseOrder = {
    id: 'o-1',
    orderNumber: 'ER-TEST1',
    status: 'CONFIRMED',
    awbCode: null,
    shiprocketOrderId: null,
    courierName: null,
    lastShipmentSyncAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    payment: { status: 'PENDING', method: 'COD' },
    statusHistory: [],
    trackingActivities: [],
  };

  it('returns null for an unknown order', async () => {
    mockOrderFindUnique.mockResolvedValue(null);
    expect(await shiprocketService.getSyncState('ER-NOPE')).toBeNull();
  });

  it('diagnoses NO_SHIPROCKET_ORDER when neither SR id nor AWB exist', async () => {
    mockOrderFindUnique.mockResolvedValue({ ...baseOrder });
    const state = await shiprocketService.getSyncState('ER-TEST1');
    expect(state?.diagnosis).toContain('NO_SHIPROCKET_ORDER');
    expect(state?.shiprocket).toBeNull();
    expect(mockShiprocketRequest).not.toHaveBeenCalled();
  });

  it('diagnoses NO_AWB when the SR order exists but has no AWB', async () => {
    mockOrderFindUnique.mockResolvedValue({ ...baseOrder, shiprocketOrderId: 123 });
    const state = await shiprocketService.getSyncState('ER-TEST1');
    expect(state?.diagnosis).toContain('NO_AWB');
  });

  it('diagnoses TERMINAL_STATUS for cancelled orders and includes the SR probe', async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...baseOrder,
      status: 'CANCELLED',
      shiprocketOrderId: 123,
      awbCode: 'AWB1',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status_id: 8, shipment_status: 'Canceled' },
    });
    const state = await shiprocketService.getSyncState('ER-TEST1');
    expect(state?.diagnosis).toContain('TERMINAL_STATUS');
    expect(state?.shiprocket).toMatchObject({ reachable: true, statusId: 8 });
  });

  it('diagnoses NEVER_SWEPT for an eligible order with no sync stamp', async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...baseOrder,
      status: 'SHIPPING',
      shiprocketOrderId: 123,
      awbCode: 'AWB1',
    });
    mockShiprocketRequest.mockResolvedValue({
      tracking_data: { shipment_status_id: 6, shipment_status: 'Shipped' },
    });
    const state = await shiprocketService.getSyncState('ER-TEST1');
    expect(state?.diagnosis).toContain('NEVER_SWEPT');
  });

  it('diagnoses AWB_CANCELLED when Shiprocket rejects the AWB as cancelled', async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...baseOrder,
      status: 'CONFIRMED',
      shiprocketOrderId: 123,
      awbCode: 'AWB-DEAD',
      lastShipmentSyncAt: new Date(),
    });
    mockShiprocketRequest.mockRejectedValue(new Error('Ohh! This AWB has been cancelled.'));
    const state = await shiprocketService.getSyncState('ER-TEST1');
    expect(state?.diagnosis).toContain('AWB_CANCELLED');
  });

  it('diagnoses SR_UNREACHABLE when the probe call throws', async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...baseOrder,
      status: 'SHIPPING',
      shiprocketOrderId: 123,
      awbCode: 'AWB1',
      lastShipmentSyncAt: new Date(),
    });
    mockShiprocketRequest.mockRejectedValue(new Error('401 from Shiprocket'));
    const state = await shiprocketService.getSyncState('ER-TEST1');
    expect(state?.diagnosis).toContain('SR_UNREACHABLE');
    expect(state?.shiprocket).toMatchObject({ reachable: false });
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
