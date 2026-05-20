import { prisma } from '@earth-revibe/db';
import { shiprocketRequest } from '../config/shiprocket';
import { env } from '../config/env';
import { APP_CONSTANTS } from '../config/constants';
import { logger } from '../config/logger';
import { OrderStatus } from '@earth-revibe/shared';

interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
}

interface ServiceabilityResult {
  courier_name: string;
  courier_company_id: number;
  rate: number;
  etd: string; // estimated delivery days like "3-5"
  cod: boolean;
}

// Shiprocket shipment_status_id → our OrderStatus. Only forward-flow values
// auto-transition; cancellations and RTO need admin review and are returned
// as `null` so the caller leaves order.status alone.
// IDs from Shiprocket docs; the text fallback matches their `shipment_status`
// label in case an account's ID table drifts.
const SR_ID_TO_STATUS: Record<number, OrderStatus> = {
  6: OrderStatus.SHIPPED,
  17: OrderStatus.OUT_FOR_DELIVERY,
  7: OrderStatus.DELIVERED,
};

const SR_TEXT_TO_STATUS: Record<string, OrderStatus> = {
  shipped: OrderStatus.SHIPPED,
  'in transit': OrderStatus.SHIPPED,
  'out for delivery': OrderStatus.OUT_FOR_DELIVERY,
  delivered: OrderStatus.DELIVERED,
};

function mapShiprocketStatus(
  id: number | string | undefined,
  text: string | number | undefined
): OrderStatus | null {
  // Shiprocket sometimes returns shipment_status as a numeric string or even a number
  // instead of the human label — be tolerant of both shapes in both arguments.
  const numericId = typeof id === 'number' ? id : typeof id === 'string' ? Number(id) : NaN;
  if (Number.isFinite(numericId) && SR_ID_TO_STATUS[numericId]) {
    return SR_ID_TO_STATUS[numericId];
  }
  if (typeof text === 'string' && text.length > 0) {
    const normalized = text.trim().toLowerCase();
    if (SR_TEXT_TO_STATUS[normalized]) return SR_TEXT_TO_STATUS[normalized];
  }
  return null;
}

export const shiprocketService = {
  /**
   * Check courier serviceability and rates for a pincode.
   * Returns available couriers with rates and ETD.
   */
  async checkServiceability(
    deliveryPincode: string,
    weight: number = 0.5, // default 500g
    codEnabled: boolean = false
  ): Promise<{ serviceable: boolean; couriers: ServiceabilityResult[] }> {
    // Previously this catch returned { serviceable: true, couriers: [] } when
    // Shiprocket was unreachable, which let customers place orders for pincodes
    // we couldn't actually fulfill. Now we propagate the error so the route
    // returns 503 and the storefront UI can surface "shipping system temporarily
    // unavailable" instead of silently lying. The circuit breaker in config/
    // shiprocket.ts already bounds the blast radius.
    const data = await shiprocketRequest<any>(
      `/courier/serviceability/?pickup_postcode=${env.SHIPROCKET_PICKUP_PINCODE}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=${codEnabled ? 1 : 0}`
    );

    const couriers: ServiceabilityResult[] = (data.data?.available_courier_companies || []).map(
      (c: any) => ({
        courier_name: c.courier_name,
        courier_company_id: c.courier_company_id,
        rate: c.rate,
        etd: c.etd,
        cod: c.cod === 1,
      })
    );

    return {
      serviceable: couriers.length > 0,
      couriers,
    };
  },

  /**
   * Create an order on Shiprocket after payment is confirmed.
   * This pushes the order to Shiprocket's dashboard for fulfillment.
   */
  async createShiprocketOrder(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        user: { select: { email: true, phone: true, firstName: true, lastName: true } },
        payment: { select: { status: true, method: true } },
      },
    });

    if (!order) throw new Error('Order not found');
    if (!order.address) throw new Error('Order has no address');

    // Build line items for Shiprocket
    const orderItems: ShiprocketOrderItem[] = order.items.map((item) => ({
      name: item.productName,
      sku: item.variantId,
      units: item.quantity,
      selling_price: Number(item.unitPrice),
    }));

    // Calculate total weight (estimate per item from constants)
    const totalWeight = Math.max(
      order.items.reduce((w, i) => w + i.quantity * APP_CONSTANTS.DEFAULT_ITEM_WEIGHT_KG, 0),
      APP_CONSTANTS.MIN_SHIPPING_WEIGHT_KG
    );

    const customerName =
      order.address.fullName ||
      (order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest');
    const customerPhone = order.address.phone || order.user?.phone || '';

    // Create order on Shiprocket
    const srOrder = await shiprocketRequest<any>('/orders/create/adhoc', {
      method: 'POST',
      body: {
        order_id: order.orderNumber,
        order_date: new Date(order.createdAt).toISOString().split('T')[0],
        pickup_location: env.SHIPROCKET_PICKUP_LOCATION || 'Earthrevibe',
        billing_customer_name: customerName.split(' ')[0],
        billing_last_name: customerName.split(' ').slice(1).join(' ') || '',
        billing_address: order.address.line1,
        billing_address_2: order.address.line2 || '',
        billing_city: order.address.city,
        billing_pincode: order.address.pinCode,
        billing_state: order.address.state,
        billing_country: 'India',
        billing_email: order.user?.email || order.guestEmail || '',
        billing_phone: customerPhone.replace(/^\+91/, ''),
        shipping_is_billing: true,
        order_items: orderItems,
        payment_method: order.payment?.method === 'COD' ? 'COD' : 'Prepaid',
        sub_total: Number(order.totalAmount),
        length: 20,
        breadth: 15,
        height: 10,
        weight: totalWeight,
      },
    });

    // Save Shiprocket order ID to our DB
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shiprocketOrderId: srOrder.order_id,
        shiprocketShipmentId: srOrder.shipment_id,
        status: 'PROCESSING',
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: 'PROCESSING',
        note: `Shiprocket order created (ID: ${srOrder.order_id})`,
      },
    });

    return {
      shiprocketOrderId: srOrder.order_id,
      shiprocketShipmentId: srOrder.shipment_id,
    };
  },

  /**
   * Request AWB (tracking number) assignment for a shipment.
   */
  async assignAWB(orderId: string, courierCompanyId?: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { shiprocketShipmentId: true },
    });

    if (!order?.shiprocketShipmentId) {
      throw new Error('No Shiprocket shipment found for this order');
    }

    // If no courier specified, let Shiprocket pick the best one
    const body: Record<string, unknown> = { shipment_id: order.shiprocketShipmentId };
    if (courierCompanyId) {
      body.courier_id = courierCompanyId;
    }

    const result = await shiprocketRequest<any>('/courier/assign/awb', {
      method: 'POST',
      body,
    });

    const awbCode = result.response?.data?.awb_code;
    const courierName = result.response?.data?.courier_name;

    if (awbCode) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          awbCode,
          courierName,
          trackingUrl: `https://shiprocket.co/tracking/${awbCode}`,
        },
      });
    }

    return { awbCode, courierName };
  },

  /**
   * Generate shipping label for a shipment.
   */
  async generateLabel(shiprocketShipmentId: number): Promise<string> {
    const result = await shiprocketRequest<any>('/courier/generate/label', {
      method: 'POST',
      body: { shipment_id: [shiprocketShipmentId] },
    });
    return result.label_url || '';
  },

  /**
   * Generate manifest for a shipment.
   */
  async generateManifest(shiprocketShipmentId: number): Promise<string> {
    const result = await shiprocketRequest<any>('/manifests/generate', {
      method: 'POST',
      body: { shipment_id: [shiprocketShipmentId] },
    });
    return result.manifest_url || '';
  },

  /**
   * Get tracking info for an order. On success, also persists any status
   * change so subsequent reads don't re-hit Shiprocket and so the admin
   * order list reflects carrier truth without an admin click. Returns a
   * discriminated `available` flag instead of silently lying when Shiprocket
   * is unreachable — UI should render "tracking temporarily unavailable".
   */
  async getTracking(orderId: string): Promise<TrackingResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { awbCode: true, courierName: true, trackingUrl: true, status: true },
    });

    if (!order?.awbCode) {
      return { available: true, tracked: false, awbCode: null, activities: [] };
    }

    let result: any;
    try {
      result = await shiprocketRequest<any>(`/courier/track/awb/${order.awbCode}`);
    } catch (err) {
      logger.warn(
        { err, orderId, awbCode: order.awbCode },
        'Shiprocket tracking lookup failed — returning stale DB state'
      );
      return {
        available: false,
        tracked: true,
        awbCode: order.awbCode,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl,
        activities: [],
        error: 'shiprocket_api_failed',
      };
    }

    const trackingData = result.tracking_data || {};
    const newStatus = mapShiprocketStatus(
      trackingData.shipment_status_id,
      trackingData.shipment_status
    );

    if (newStatus && newStatus !== order.status) {
      await persistStatusChange(orderId, newStatus, {
        source: 'tracking-read',
        shipmentStatusId: trackingData.shipment_status_id,
        shipmentStatusText: trackingData.shipment_status,
      });
    }

    return {
      available: true,
      tracked: true,
      awbCode: order.awbCode,
      courierName: order.courierName,
      trackingUrl: order.trackingUrl,
      currentStatus: trackingData.shipment_status_id,
      currentStatusDescription: trackingData.shipment_status,
      etd: trackingData.etd,
      activities: (trackingData.shipment_track_activities || []).map((a: any) => ({
        date: a.date,
        status: a['sr-status-label'],
        activity: a.activity,
        location: a.location,
      })),
    };
  },

  /**
   * Sweep all in-flight orders and refresh their shipment status from
   * Shiprocket. Used by the cron endpoint /api/v1/internal/refresh-shipment-status.
   *
   * Selects orders that have an AWB and whose status is not yet a terminal
   * value (DELIVERED, CANCELLED, RETURNED, REFUNDED). Processes them in
   * small batches with awaited per-call delay so we don't slam Shiprocket's
   * rate limit. Each lookup is independently try/catched so one bad AWB
   * doesn't abort the sweep.
   */
  async refreshAllPendingShipments(options: { limit?: number } = {}): Promise<RefreshSweepResult> {
    const limit = options.limit ?? APP_CONSTANTS.SHIPROCKET_REFRESH_BATCH_SIZE;
    // TODO: once the offline-sales-cluster soft-delete column lands on main,
    // wrap this in the `notArchived` helper from utils/order-filters.ts so the
    // sweep skips archived orders. The deletedAt field isn't in the committed
    // Prisma schema yet, so referencing it here breaks CI's generated typings.
    const orders = await prisma.order.findMany({
      where: {
        awbCode: { not: null },
        status: { in: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY] },
      },
      select: { id: true, orderNumber: true, awbCode: true, status: true },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });

    let updated = 0;
    let unchanged = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        const result = await shiprocketRequest<any>(`/courier/track/awb/${order.awbCode}`);
        const trackingData = result.tracking_data || {};
        const newStatus = mapShiprocketStatus(
          trackingData.shipment_status_id,
          trackingData.shipment_status
        );

        if (newStatus && newStatus !== order.status) {
          await persistStatusChange(order.id, newStatus, {
            source: 'cron-refresh',
            shipmentStatusId: trackingData.shipment_status_id,
            shipmentStatusText: trackingData.shipment_status,
          });
          updated++;
        } else {
          unchanged++;
        }
      } catch (err) {
        failed++;
        logger.warn(
          { err, orderId: order.id, awbCode: order.awbCode },
          'Shiprocket refresh failed for one order — continuing sweep'
        );
      }

      // Small inter-call pause to be polite to Shiprocket's rate limiter.
      await new Promise((r) => setTimeout(r, APP_CONSTANTS.SHIPROCKET_REFRESH_DELAY_MS));
    }

    return {
      scanned: orders.length,
      updated,
      unchanged,
      failed,
      limit,
    };
  },

  /**
   * Recover orders that were CONFIRMED but never got a Shiprocket order
   * created (the post-payment fire-and-forget call failed). Called from
   * /api/v1/internal/cleanup.
   */
  async reconcileMissingShipments(options: { limit?: number } = {}): Promise<ReconcileResult> {
    const limit = options.limit ?? APP_CONSTANTS.SHIPROCKET_RECONCILE_BATCH_SIZE;
    // Only retry orders confirmed long enough ago that a transient failure
    // would have cleared (avoids racing the post-payment fire-and-forget).
    const cutoff = new Date(Date.now() - APP_CONSTANTS.SHIPROCKET_RECONCILE_MIN_AGE_MS);

    // TODO: add `deletedAt: null` (via notArchived helper) once the
    // offline-sales-cluster migration is on main — see same TODO above.
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.CONFIRMED,
        shiprocketOrderId: null,
        createdAt: { lt: cutoff },
      },
      select: { id: true, orderNumber: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let recovered = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        await shiprocketService.createShiprocketOrder(order.id);
        recovered++;
      } catch (err) {
        failed++;
        logger.error(
          { err, orderId: order.id, orderNumber: order.orderNumber },
          'Shiprocket reconcile: createShiprocketOrder retry failed'
        );
      }
    }

    return { scanned: orders.length, recovered, failed };
  },
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface TrackingResult {
  available: boolean;
  tracked: boolean;
  awbCode: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  currentStatus?: number;
  currentStatusDescription?: string;
  etd?: string;
  activities: Array<{
    date: string;
    status: string;
    activity: string;
    location: string;
  }>;
  error?: string;
}

interface RefreshSweepResult {
  scanned: number;
  updated: number;
  unchanged: number;
  failed: number;
  limit: number;
}

interface ReconcileResult {
  scanned: number;
  recovered: number;
  failed: number;
}

async function persistStatusChange(
  orderId: string,
  newStatus: OrderStatus,
  meta: {
    source: 'tracking-read' | 'cron-refresh';
    shipmentStatusId?: number;
    shipmentStatusText?: string;
  }
): Promise<void> {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: newStatus,
        note: `Shiprocket ${meta.source}: ${meta.shipmentStatusText ?? `status_id=${meta.shipmentStatusId ?? '?'}`}`,
      },
    }),
  ]);
  logger.info(
    {
      orderId,
      newStatus,
      source: meta.source,
      srStatusId: meta.shipmentStatusId,
      srStatusText: meta.shipmentStatusText,
    },
    'Order status updated from Shiprocket'
  );
}
