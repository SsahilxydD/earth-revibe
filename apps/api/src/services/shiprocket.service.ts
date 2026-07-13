import { prisma } from '@earth-revibe/db';
import { shiprocketRequest } from '../config/shiprocket';
import { env } from '../config/env';
import { APP_CONSTANTS } from '../config/constants';
import { logger } from '../config/logger';
import { OrderStatus } from '@earth-revibe/shared';
import { awardOrderPoints } from './loyalty-award.service';
import { settleCodPaymentOnDelivery } from './payment-settlement.service';

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

// Shiprocket shipment_status_id → our OrderStatus (6-value enum).
// IDs from Shiprocket docs; the text fallback matches their `shipment_status`
// label in case an account's ID table drifts.
//
// Multiple carrier sub-states (Shipped / In Transit / Out For Delivery) all
// collapse to our single SHIPPING bucket. Carrier-driven terminal states
// (CANCELLED, RTO_DELIVERED → RETURNED) auto-apply and trigger a Discord
// alert (notifyCarrierTerminalEvent below) so ops sees them.
const SR_ID_TO_STATUS: Record<number, OrderStatus> = {
  6: OrderStatus.SHIPPING,
  17: OrderStatus.SHIPPING, // Out For Delivery — still in flight
  7: OrderStatus.DELIVERED,
  8: OrderStatus.CANCELLED, // Cancelled
  22: OrderStatus.CANCELLED, // Damaged
  10: OrderStatus.RETURNED, // RTO Delivered (back to seller)
  // Shiprocket code 19 = "Out For Pickup" and 13 = "Pickup Error" are
  // PRE-TRANSIT pickup-phase states, not terminal outcomes — the courier
  // hasn't collected the parcel yet and Shiprocket will retry. They are
  // deliberately omitted so mapShiprocketStatus returns null and the order
  // stays CONFIRMED (awaiting pickup) and keeps getting swept. They used to be
  // mis-mapped: 19 → RETURNED (mislabelled "RTO Delivered", which is really
  // code 10) and 13 → CANCELLED (mislabelled "Lost", which is really code 12).
  // That flipped live pickups into a terminal state rendered as a red/error
  // badge on the admin, so an out-for-pickup order looked cancelled.
};

const SR_TEXT_TO_STATUS: Record<string, OrderStatus> = {
  shipped: OrderStatus.SHIPPING,
  'in transit': OrderStatus.SHIPPING,
  'out for delivery': OrderStatus.SHIPPING,
  delivered: OrderStatus.DELIVERED,
  canceled: OrderStatus.CANCELLED,
  cancelled: OrderStatus.CANCELLED,
  'rto delivered': OrderStatus.RETURNED,
};

// Statuses that are "carrier-driven" — once Shiprocket owns them, admin
// shouldn't manually overwrite (see admin-order.service updateStatus guard).
// SHIPPING and DELIVERED are both downstream of the AWB; only the carrier
// can legitimately move an order through them.
const CARRIER_OWNED_STATUSES: OrderStatus[] = [OrderStatus.SHIPPING, OrderStatus.DELIVERED];

// Carrier-terminal events that warrant a Discord ping (so ops sees RETURNED
// transitions that didn't come from an admin click). CANCELLED never reaches
// this set anymore — a Shiprocket "Cancelled" is a SHIPMENT event and takes
// the detach branch in syncTrackingState instead of touching order.status.
const CARRIER_NOTIFY_STATUSES = new Set<OrderStatus>([OrderStatus.RETURNED]);

export function isCarrierOwnedStatus(status: OrderStatus): boolean {
  return CARRIER_OWNED_STATUSES.includes(status);
}

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

/**
 * Defensive extraction for /courier/assign/awb. Shiprocket has at least three
 * documented + observed shapes for this endpoint:
 *
 *   1. `result.response.data.awb_code` (documented happy path)
 *   2. `result.awb_code` (sometimes returned on re-assign / partial update)
 *   3. `result.data.awb_code` (older accounts, undocumented variant)
 *
 * Returning undefined silently — as the original code did — meant the admin
 * UI showed success while the DB never recorded the AWB. Now the caller
 * throws when extraction fails so the failure surfaces.
 */
function extractAwbFromAssignResponse(result: any): {
  awbCode: string | undefined;
  courierName: string | undefined;
} {
  const candidates: any[] = [result?.response?.data, result?.data, result];
  for (const c of candidates) {
    if (c && typeof c.awb_code === 'string' && c.awb_code.trim().length > 0) {
      return {
        awbCode: c.awb_code.trim(),
        courierName: typeof c.courier_name === 'string' ? c.courier_name : undefined,
      };
    }
  }
  return { awbCode: undefined, courierName: undefined };
}

/**
 * Defensive extraction for /orders/show/{id}. The endpoint returns the order
 * object with a nested `shipments` array; the first shipment's `awb` field
 * is the canonical assigned AWB. Status lives at `status_code` (numeric) or
 * `status` (text). Real responses sometimes nest under `data`, sometimes not.
 */
function extractFromOrderShow(result: any): {
  awbCode: string | undefined;
  courierName: string | undefined;
  statusId: number | string | undefined;
  statusText: string | undefined;
} {
  // Order object may be at result.data or at result directly.
  const order = result?.data ?? result;
  if (!order)
    return {
      awbCode: undefined,
      courierName: undefined,
      statusId: undefined,
      statusText: undefined,
    };

  // Shipments may be at order.shipments (most common) or order.shipments[0] = single object.
  const shipmentsRaw = order.shipments;
  const shipment: any = Array.isArray(shipmentsRaw)
    ? shipmentsRaw[0]
    : shipmentsRaw && typeof shipmentsRaw === 'object'
      ? shipmentsRaw
      : undefined;

  const awb =
    typeof shipment?.awb === 'string' && shipment.awb.trim().length > 0
      ? shipment.awb.trim()
      : typeof shipment?.awb_code === 'string' && shipment.awb_code.trim().length > 0
        ? shipment.awb_code.trim()
        : undefined;

  const courier =
    typeof shipment?.courier_name === 'string'
      ? shipment.courier_name
      : typeof shipment?.courier === 'string'
        ? shipment.courier
        : undefined;

  // Status may be at order.status (text), order.status_code (numeric), or
  // shipment.status. Try in that order.
  const statusId =
    typeof order.status_code === 'number'
      ? order.status_code
      : typeof shipment?.status_code === 'number'
        ? shipment.status_code
        : undefined;
  const statusText =
    typeof order.status === 'string'
      ? order.status
      : typeof shipment?.status === 'string'
        ? shipment.status
        : undefined;

  return { awbCode: awb, courierName: courier, statusId, statusText };
}

/**
 * Pull the "current carrier-reported status" out of Shiprocket's tracking_data.
 *
 * BUG HISTORY: I originally read tracking_data.shipment_status_id / .shipment_status
 * directly. Those fields are a stale top-level rollup — for AWB 369342447516 the
 * top-level showed SHIPPED (id 6) for hours after the order had been Delivered
 * (the public tracking page and the activities log both said DELIVERED). Net
 * effect: the sweep saw the same value as the DB, called it "unchanged", and
 * never advanced the order.
 *
 * The canonical "what does the carrier say *right now*" lives in
 * tracking_data.shipment_track[0].current_status_id / .current_status. We try
 * that first; fall back to the most-recent shipment_track_activity entry; fall
 * back to the legacy top-level fields only if everything else is missing.
 */
function extractCurrentStatus(trackingData: any): {
  id: number | string | undefined;
  text: string | number | undefined;
} {
  const track = Array.isArray(trackingData?.shipment_track)
    ? trackingData.shipment_track[0]
    : undefined;
  if (track && (track.current_status_id || track.current_status)) {
    return { id: track.current_status_id, text: track.current_status };
  }

  // Fallback: the most recent activity carries an `sr-status-label`. Sort by
  // `date` desc so a non-chronological array still surfaces the latest.
  const activities = Array.isArray(trackingData?.shipment_track_activities)
    ? trackingData.shipment_track_activities
    : [];
  if (activities.length > 0) {
    const latest = activities
      .filter((a: any) => a?.date)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const label = latest?.['sr-status-label'];
    if (typeof label === 'string' && label.length > 0) {
      return { id: undefined, text: label };
    }
  }

  // Last resort — the original (buggy) location. Kept so partial responses
  // don't regress to "null status" when the top-level *is* meaningful.
  return {
    id: trackingData?.shipment_status_id,
    text: trackingData?.shipment_status,
  };
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
   *
   * `orderIdSuffix` lets a re-ship send a UNIQUE reference to Shiprocket.
   * Shiprocket dedupes /orders/create/adhoc on the `order_id` we send: if an
   * order with that reference already exists (e.g. an earlier attempt that was
   * later cancelled on their side), Shiprocket returns the OLD order — and with
   * it the dead AWB — instead of minting a fresh one, and our status sweep then
   * re-cancels the order. Passing a suffix (`ER-…-R2`) sidesteps the collision
   * so the carrier issues a brand-new AWB. The DB binding is unaffected: we
   * store Shiprocket's own numeric order_id / shipment_id from the response, and
   * webhooks/reconcile join on those + awbCode, never on the reference we send.
   * Omitted on a first ship → byte-identical payload to before.
   */
  async createShiprocketOrder(orderId: string, orderIdSuffix?: string) {
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

    // Reference we hand Shiprocket. Unique per re-ship to dodge their dedupe
    // (see method doc). Sanitised to the chars Shiprocket accepts in a ref.
    const shiprocketOrderRef = orderIdSuffix
      ? `${order.orderNumber}-${orderIdSuffix.replace(/[^A-Za-z0-9-]/g, '')}`
      : order.orderNumber;

    // Create order on Shiprocket
    const srOrder = await shiprocketRequest<any>('/orders/create/adhoc', {
      method: 'POST',
      body: {
        order_id: shiprocketOrderRef,
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

    // Save Shiprocket order ID + shipment ID. Order.status stays CONFIRMED
    // until the carrier reports actual shipping movement — the AWB existence
    // (`shiprocketOrderId != null && awbCode == null`) is the "created on
    // Shiprocket, awaiting pickup" signal in the new six-state model.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shiprocketOrderId: srOrder.order_id,
        shiprocketShipmentId: srOrder.shipment_id,
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

    // Shiprocket returns three different response shapes for this endpoint
    // depending on whether the AWB was newly assigned, was already assigned,
    // or hit a partial-failure (e.g., courier returned an error). The
    // documented shape is `result.response.data.awb_code`, but real responses
    // sometimes put it at `result.awb_code` or `result.data.awb_code`.
    // Walk all three before giving up.
    const extracted = extractAwbFromAssignResponse(result);

    if (!extracted.awbCode) {
      // Historical bug: if extraction returned undefined we silently swallowed
      // it and returned `{ awbCode: undefined }`, leaving the admin UI to show
      // success while the DB stayed empty. We've since accumulated 23+ orders
      // with shiprocketOrderId set but awbCode null. Now we throw — let the
      // caller decide. The reconcile/backfill flow below recovers the AWB via
      // /orders/show without going through this endpoint.
      logger.error(
        { orderId, shipmentId: order.shiprocketShipmentId, rawResponse: result },
        'Shiprocket assign-awb returned a response we could not parse'
      );
      throw new Error(
        'Shiprocket assigned AWB but the response shape was unrecognised — backfill via reconcile-awbs.'
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        awbCode: extracted.awbCode,
        courierName: extracted.courierName ?? null,
        trackingUrl: `https://shiprocket.co/tracking/${extracted.awbCode}`,
      },
    });

    return { awbCode: extracted.awbCode, courierName: extracted.courierName };
  },

  /**
   * Schedule a Shiprocket REVERSE pickup for a return: collect the returned
   * line items from the customer (pickup_*) and bring them back to the seller's
   * return address (shipping_*, from SHIPROCKET_RETURN_* env). Persists the
   * resulting reverse-shipment ids onto the ReturnRequest.
   *
   * NOTE: net-new integration — requires the Shiprocket account to have returns
   * enabled and the SHIPROCKET_RETURN_* env vars configured; verify live before
   * relying on it. Callers guard this and Discord-alert on failure.
   */
  async createReturnOrder(returnRequestId: string) {
    const ret = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        items: true,
        order: {
          include: {
            address: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });
    if (!ret) throw new Error('Return not found');
    const addr = ret.order.address;
    if (!addr) throw new Error('Return order has no pickup address');

    const orderItems = await prisma.orderItem.findMany({
      where: { id: { in: ret.items.map((i) => i.orderItemId) } },
    });
    const oiById = new Map(orderItems.map((o) => [o.id, o]));
    const lineItems: ShiprocketOrderItem[] = ret.items.map((ri) => {
      const oi = oiById.get(ri.orderItemId);
      return {
        name: oi?.productName ?? 'Returned item',
        sku: oi?.variantId ?? ri.orderItemId,
        units: ri.quantity,
        selling_price: oi ? Number(oi.unitPrice) : 0,
      };
    });
    const subTotal = lineItems.reduce((s, i) => s + i.selling_price * i.units, 0);
    const totalUnits = ret.items.reduce((u, i) => u + i.quantity, 0);
    const weight = Math.max(
      totalUnits * APP_CONSTANTS.DEFAULT_ITEM_WEIGHT_KG,
      APP_CONSTANTS.MIN_SHIPPING_WEIGHT_KG
    );

    const custName = (addr.fullName || 'Customer').split(' ');
    const srReturn = await shiprocketRequest<any>('/orders/create/return', {
      method: 'POST',
      body: {
        order_id: `${ret.order.orderNumber}-R${ret.id.slice(-6)}`,
        order_date: new Date().toISOString().split('T')[0],
        // Pickup = the customer (origin of the reverse shipment).
        pickup_customer_name: custName[0],
        pickup_last_name: custName.slice(1).join(' ') || '',
        pickup_address: addr.line1,
        pickup_address_2: addr.line2 || '',
        pickup_city: addr.city,
        pickup_state: addr.state,
        pickup_country: 'India',
        pickup_pincode: addr.pinCode,
        pickup_email: ret.order.user?.email || ret.order.guestEmail || '',
        pickup_phone: (addr.phone || ret.order.user?.phone || '').replace(/^\+91/, ''),
        // Shipping = the seller's return-to address (must be configured).
        shipping_customer_name: process.env.SHIPROCKET_RETURN_NAME || 'Earth Revibe',
        shipping_last_name: '',
        shipping_address: process.env.SHIPROCKET_RETURN_ADDRESS || '',
        shipping_address_2: '',
        shipping_city: process.env.SHIPROCKET_RETURN_CITY || '',
        shipping_country: 'India',
        shipping_pincode: process.env.SHIPROCKET_RETURN_PINCODE || '',
        shipping_state: process.env.SHIPROCKET_RETURN_STATE || '',
        shipping_email: process.env.SHIPROCKET_RETURN_EMAIL || '',
        shipping_phone: (process.env.SHIPROCKET_RETURN_PHONE || '').replace(/^\+91/, ''),
        order_items: lineItems,
        payment_method: 'Prepaid',
        sub_total: subTotal,
        length: 20,
        breadth: 15,
        height: 10,
        weight,
      },
    });

    await prisma.returnRequest.update({
      where: { id: ret.id },
      data: {
        returnShiprocketOrderId: srReturn.order_id ?? null,
        returnShipmentId: srReturn.shipment_id ?? null,
        returnAwbCode: srReturn.awb_code ?? null,
        returnTrackingUrl: srReturn.awb_code
          ? `https://shiprocket.co/tracking/${srReturn.awb_code}`
          : null,
      },
    });

    return {
      returnShiprocketOrderId: srReturn.order_id,
      returnShipmentId: srReturn.shipment_id,
    };
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
      select: {
        awbCode: true,
        courierName: true,
        trackingUrl: true,
        status: true,
        orderNumber: true,
        lastShipmentSyncAt: true,
      },
    });

    if (!order?.awbCode) {
      // No AWB yet — return persisted activities (none expected) and bail.
      return {
        available: true,
        tracked: false,
        awbCode: null,
        activities: [],
        lastSyncAt: order?.lastShipmentSyncAt ?? null,
      };
    }

    let result: any;
    try {
      result = await shiprocketRequest<any>(`/courier/track/awb/${order.awbCode}`);
    } catch (err) {
      logger.warn(
        { err, orderId, awbCode: order.awbCode },
        'Shiprocket tracking lookup failed — returning persisted activities'
      );
      // Fall back to persisted activities so customer/admin still see the last
      // known state instead of an empty UI.
      const persisted = await prisma.orderTrackingActivity.findMany({
        where: { orderId },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      });
      return {
        available: false,
        tracked: true,
        awbCode: order.awbCode,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl,
        activities: persisted.map((a) => ({
          date: a.occurredAt.toISOString(),
          status: a.status,
          activity: a.activity ?? '',
          location: a.location ?? '',
        })),
        error: 'shiprocket_api_failed',
        lastSyncAt: order.lastShipmentSyncAt,
      };
    }

    const trackingData = result.tracking_data || {};
    const { id: srStatusId, text: srStatusText } = extractCurrentStatus(trackingData);
    const newStatus = mapShiprocketStatus(srStatusId, srStatusText);
    const activities = parseActivities(trackingData.shipment_track_activities);

    await syncTrackingState(orderId, {
      newStatus,
      currentStatus: order.status as OrderStatus,
      activities,
      shipmentStatusId: typeof srStatusId === 'number' ? srStatusId : undefined,
      shipmentStatusText: typeof srStatusText === 'string' ? srStatusText : undefined,
      source: 'tracking-read',
      orderNumber: order.orderNumber,
    });

    return {
      available: true,
      tracked: true,
      awbCode: order.awbCode,
      courierName: order.courierName,
      trackingUrl: order.trackingUrl,
      currentStatus: typeof srStatusId === 'number' ? srStatusId : undefined,
      currentStatusDescription: typeof srStatusText === 'string' ? srStatusText : undefined,
      etd: trackingData.etd,
      activities: activities.map((a) => ({
        date: a.occurredAt.toISOString(),
        status: a.status,
        activity: a.activity,
        location: a.location,
      })),
      lastSyncAt: new Date(),
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
        // Sweep CONFIRMED orders (AWB assigned, waiting for first carrier scan
        // to flip to SHIPPING) and SHIPPING orders (in-flight). Anything
        // DELIVERED/CANCELLED/RETURNED is terminal and we stop refreshing.
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPING] },
      },
      select: { id: true, orderNumber: true, awbCode: true, status: true },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });

    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    let detached = 0;

    for (const order of orders) {
      try {
        const result = await shiprocketRequest<any>(`/courier/track/awb/${order.awbCode}`);
        const trackingData = result.tracking_data || {};
        const { id: srStatusId, text: srStatusText } = extractCurrentStatus(trackingData);
        const newStatus = mapShiprocketStatus(srStatusId, srStatusText);
        const activities = parseActivities(trackingData.shipment_track_activities);

        const changed = await syncTrackingState(order.id, {
          newStatus,
          currentStatus: order.status as OrderStatus,
          activities,
          shipmentStatusId: typeof srStatusId === 'number' ? srStatusId : undefined,
          shipmentStatusText: typeof srStatusText === 'string' ? srStatusText : undefined,
          source: 'cron-refresh',
          orderNumber: order.orderNumber,
        });
        if (changed) updated++;
        else unchanged++;
      } catch (err) {
        if (isAwbCancelledError(err)) {
          try {
            await detachCancelledShipment({
              orderId: order.id,
              currentStatus: order.status as OrderStatus,
              orderNumber: order.orderNumber,
              source: 'cron-refresh',
              detail: 'AWB cancelled (tracking API error)',
            });
            detached++;
          } catch (detachErr) {
            failed++;
            logger.error(
              { err: detachErr, orderId: order.id, awbCode: order.awbCode },
              'Failed to detach cancelled AWB — continuing sweep'
            );
          }
        } else {
          failed++;
          logger.warn(
            { err, orderId: order.id, awbCode: order.awbCode },
            'Shiprocket refresh failed for one order — continuing sweep'
          );
        }
      }

      // Small inter-call pause to be polite to Shiprocket's rate limiter.
      await new Promise((r) => setTimeout(r, APP_CONSTANTS.SHIPROCKET_REFRESH_DELAY_MS));
    }

    return {
      scanned: orders.length,
      updated,
      unchanged,
      failed,
      detached,
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
        // Send a UNIQUE reference per attempt. This cron picks up orders whose
        // shiprocketOrderId is null — which includes orders just reopened after
        // a cancellation. Re-sending the bare orderNumber would let Shiprocket's
        // dedupe hand back the OLD cancelled order + its dead AWB (which the
        // status sweep then re-cancels). A timestamped suffix forces a fresh
        // Shiprocket order every time, so the cron can never resurrect a dead
        // AWB. See createShiprocketOrder's doc for the dedupe details.
        const retrySuffix = `RC${Date.now().toString(36)}`;
        await shiprocketService.createShiprocketOrder(order.id, retrySuffix);
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

  /**
   * Backfill missing awbCodes from Shiprocket. For each order with
   * shiprocketOrderId set but awbCode null, query /orders/show/{id} to read
   * the assigned AWB and current carrier status, then persist both. This
   * recovers from the historical assignAWB bug where the response wasn't
   * parsed correctly and the AWB never landed in our DB.
   *
   * Returns counts: scanned (eligible), backfilled (awb saved), still_missing
   * (Shiprocket says no AWB yet), failed (API error).
   */
  async reconcileMissingAwbs(options: { limit?: number } = {}): Promise<ReconcileAwbsResult> {
    const limit = options.limit ?? APP_CONSTANTS.SHIPROCKET_RECONCILE_BATCH_SIZE;

    const orders = await prisma.order.findMany({
      where: {
        shiprocketOrderId: { not: null },
        awbCode: null,
        // Don't bother with terminal-state orders — refunding a cancelled order
        // doesn't help, and missing-AWB on a CANCELLED order is expected.
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED],
        },
      },
      select: {
        id: true,
        orderNumber: true,
        shiprocketOrderId: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    let backfilled = 0;
    let still_missing = 0;
    let failed = 0;

    for (const order of orders) {
      try {
        // Shiprocket's /orders/show/{id} returns the order plus its shipments
        // array. The first shipment's `awb` field is the canonical AWB.
        const result = await shiprocketRequest<any>(`/orders/show/${order.shiprocketOrderId}`);
        const extracted = extractFromOrderShow(result);

        if (!extracted.awbCode) {
          still_missing++;
          logger.info(
            {
              orderId: order.id,
              orderNumber: order.orderNumber,
              shiprocketOrderId: order.shiprocketOrderId,
            },
            'Reconcile: Shiprocket has no AWB assigned for this order yet'
          );
        } else {
          // Atomic update: save AWB, courier, tracking URL, sync timestamp,
          // and (if Shiprocket also reports a status that maps to a forward
          // state) the order status.
          const newStatus =
            extracted.statusId || extracted.statusText
              ? mapShiprocketStatus(extracted.statusId, extracted.statusText)
              : null;
          const statusChanged = newStatus !== null && newStatus !== order.status;

          const data: any = {
            awbCode: extracted.awbCode,
            courierName: extracted.courierName ?? null,
            trackingUrl: `https://shiprocket.co/tracking/${extracted.awbCode}`,
            lastShipmentSyncAt: new Date(),
          };
          if (statusChanged) data.status = newStatus;

          const ops: any[] = [prisma.order.update({ where: { id: order.id }, data })];
          if (statusChanged) {
            ops.push(
              prisma.orderStatusHistory.create({
                data: {
                  orderId: order.id,
                  status: newStatus as OrderStatus,
                  note: `Shiprocket reconcile (orders/show): awb=${extracted.awbCode}, status=${extracted.statusText ?? extracted.statusId}`,
                },
              })
            );
          }
          await prisma.$transaction(ops);
          backfilled++;
          logger.info(
            {
              orderId: order.id,
              orderNumber: order.orderNumber,
              awbCode: extracted.awbCode,
              statusChange: statusChanged ? `${order.status} → ${newStatus}` : 'unchanged',
            },
            'Reconcile: backfilled AWB from Shiprocket'
          );
        }
      } catch (err) {
        failed++;
        logger.warn(
          { err, orderId: order.id, shiprocketOrderId: order.shiprocketOrderId },
          'Reconcile: /orders/show call failed for one order — continuing'
        );
      }

      // Polite inter-call pause.
      await new Promise((r) => setTimeout(r, APP_CONSTANTS.SHIPROCKET_REFRESH_DELAY_MS));
    }

    return { scanned: orders.length, backfilled, still_missing, failed, limit };
  },

  /**
   * Refresh a single order's shipment state by AWB. Used by the Shiprocket
   * webhook handler — payload arrives with an AWB and we fan out the same
   * sync logic that powers /refresh-shipment-status. Returns null if no
   * order in our DB matches the AWB.
   */
  /**
   * Ops diagnostic behind GET /api/v1/internal/sync-state/:orderNumber —
   * answers "why hasn't this order synced" in one read: local sync fields,
   * payment, recent history + carrier activities, a live read-only Shiprocket
   * probe of the AWB, and a `diagnosis` explaining the failure leg. With
   * refresh=true it first runs the standard refreshByAwb write-through, so
   * probing also heals the order when Shiprocket has news.
   */
  async getSyncState(orderNumber: string, options: { refresh?: boolean } = {}) {
    const load = () =>
      prisma.order.findUnique({
        where: { orderNumber },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          awbCode: true,
          shiprocketOrderId: true,
          courierName: true,
          lastShipmentSyncAt: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true,
          payment: { select: { status: true, method: true } },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { status: true, note: true, createdAt: true },
          },
          trackingActivities: {
            orderBy: { occurredAt: 'desc' },
            take: 8,
            select: { occurredAt: true, status: true, activity: true, location: true },
          },
        },
      });

    let order = await load();
    if (!order) return null;

    let refreshed: { changed: boolean } | null = null;
    if (options.refresh && order.awbCode) {
      try {
        const result = await shiprocketService.refreshByAwb(order.awbCode);
        refreshed = result ? { changed: result.changed } : null;
        order = (await load())!;
      } catch (err) {
        logger.warn({ err, orderNumber }, 'sync-state: refresh pass failed — continuing');
      }
    }

    // Read-only probe: what does Shiprocket say right now?
    let shiprocket: {
      reachable: boolean;
      statusId?: number | string;
      statusText?: string | number;
      mapped?: OrderStatus | null;
      error?: string;
    } | null = null;
    if (order.awbCode) {
      try {
        const result = await shiprocketRequest<any>(`/courier/track/awb/${order.awbCode}`);
        const trackingData = result.tracking_data || {};
        const { id, text } = extractCurrentStatus(trackingData);
        shiprocket = {
          reachable: true,
          statusId: id,
          statusText: text,
          mapped: mapShiprocketStatus(id, text),
        };
      } catch (err) {
        shiprocket = { reachable: false, error: String(err) };
      }
    }

    const terminal = ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status);
    const diagnosis =
      !order.shiprocketOrderId && !order.awbCode
        ? 'NO_SHIPROCKET_ORDER — post-payment Shiprocket creation failed (daily reconcile retries it; check its logs) or this order ships via another courier. Nothing to sync; drive the status manually if external.'
        : !order.awbCode
          ? 'NO_AWB — Shiprocket order exists but no AWB assigned. The 10-min cron backfills AWBs (reconcileMissingAwbs); if this persists, that cron is not running or AWB assignment keeps failing on the Shiprocket side.'
          : terminal
            ? `TERMINAL_STATUS — sweeps skip ${order.status} orders by design. If this CANCELLED/RETURNED is wrong, restore it in admin (CANCELLED → CONFIRMED).`
            : shiprocket && !shiprocket.reachable && /awb.*cancel/i.test(shiprocket.error ?? '')
              ? 'AWB_CANCELLED — Shiprocket cancelled this AWB (pickup never happened or the shipment was re-created). Re-run with refresh=true to detach it, then re-ship or drive the status manually.'
              : shiprocket && !shiprocket.reachable
                ? 'SR_UNREACHABLE — the Shiprocket tracking call failed (auth / rate limit / network). Check SHIPROCKET_EMAIL/PASSWORD and API logs.'
                : shiprocket && shiprocket.mapped == null
                  ? 'UNMAPPED_SR_STATUS — Shiprocket reports a pre-transit or unknown status our map deliberately ignores (see SR_ID_TO_STATUS); the order stays as-is until a mapped event arrives.'
                  : order.lastShipmentSyncAt == null
                    ? 'NEVER_SWEPT — sweep-eligible but never synced once: the 10-minute refresh cron is almost certainly not running (verify cron-job.org hits /internal/refresh-shipment-status).'
                    : 'SWEEP_ELIGIBLE — this order syncs normally; compare lastShipmentSyncAt against the 10-minute cadence to judge cron health.';

    return { order, refreshed, shiprocket, diagnosis };
  },

  async refreshByAwb(awbCode: string): Promise<{ changed: boolean; orderId: string } | null> {
    const order = await prisma.order.findFirst({
      where: { awbCode },
      select: { id: true, orderNumber: true, status: true },
    });
    if (!order) {
      logger.warn({ awbCode }, 'Shiprocket webhook: AWB not found in our DB');
      return null;
    }

    let result: any;
    try {
      result = await shiprocketRequest<any>(`/courier/track/awb/${awbCode}`);
    } catch (err) {
      if (isAwbCancelledError(err)) {
        await detachCancelledShipment({
          orderId: order.id,
          currentStatus: order.status as OrderStatus,
          orderNumber: order.orderNumber,
          source: 'webhook',
          detail: 'AWB cancelled (tracking API error)',
        });
        return { changed: true, orderId: order.id };
      }
      throw err;
    }
    const trackingData = result.tracking_data || {};
    const { id: srStatusId, text: srStatusText } = extractCurrentStatus(trackingData);
    const newStatus = mapShiprocketStatus(srStatusId, srStatusText);
    const activities = parseActivities(trackingData.shipment_track_activities);

    const changed = await syncTrackingState(order.id, {
      newStatus,
      currentStatus: order.status as OrderStatus,
      activities,
      shipmentStatusId: typeof srStatusId === 'number' ? srStatusId : undefined,
      shipmentStatusText: typeof srStatusText === 'string' ? srStatusText : undefined,
      source: 'webhook',
      orderNumber: order.orderNumber,
    });

    return { changed, orderId: order.id };
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
  lastSyncAt: Date | null;
}

interface RefreshSweepResult {
  scanned: number;
  updated: number;
  unchanged: number;
  failed: number;
  limit: number;
  detached: number;
}

interface ReconcileResult {
  scanned: number;
  recovered: number;
  failed: number;
}

interface ReconcileAwbsResult {
  scanned: number;
  backfilled: number;
  still_missing: number;
  failed: number;
  limit: number;
}

interface ParsedActivity {
  occurredAt: Date;
  status: string;
  activity: string;
  location: string;
}

function parseActivities(raw: unknown): ParsedActivity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a: any) => {
      // Shiprocket dates can be "2026-05-20 12:34:56" or ISO; Date can handle both,
      // but bail if it's invalid to avoid writing garbage rows.
      const d = a?.date ? new Date(a.date) : null;
      if (!d || Number.isNaN(d.getTime())) return null;
      const status = typeof a['sr-status-label'] === 'string' ? a['sr-status-label'].trim() : '';
      if (!status) return null;
      return {
        occurredAt: d,
        status,
        activity: typeof a.activity === 'string' ? a.activity : '',
        location: typeof a.location === 'string' ? a.location : '',
      };
    })
    .filter((a): a is ParsedActivity => a !== null);
}

/**
 * Shiprocket rejects tracking calls for cancelled AWBs with an API error
 * ("Ohh! This AWB has been cancelled.") instead of a status payload, so the
 * status-8 detach branch never sees it. Recognise it at the error layer.
 */
function isAwbCancelledError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /awb.*cancel/i.test(msg);
}

/**
 * Detach a dead Shiprocket shipment from its order: null the SR ids (so the
 * sweep and the AWB-reconcile pass can't resurrect it), keep order.status,
 * leave an audit row, ping ops. Shared by the status-8/22 branch in
 * syncTrackingState and the AWB-cancelled error paths.
 */
async function detachCancelledShipment(args: {
  orderId: string;
  currentStatus: OrderStatus;
  orderNumber: string;
  source: 'tracking-read' | 'cron-refresh' | 'webhook';
  detail: string;
}): Promise<void> {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: args.orderId },
      data: {
        awbCode: null,
        shiprocketOrderId: null,
        courierName: null,
        lastShipmentSyncAt: new Date(),
      },
    }),
    prisma.orderStatusHistory.create({
      data: {
        orderId: args.orderId,
        status: args.currentStatus,
        note:
          `Shiprocket shipment cancelled (${args.source}: ${args.detail}) — ` +
          `shipment detached, order NOT cancelled. Re-ship or update status manually.`,
      },
    }),
  ]);

  logger.info(
    { orderId: args.orderId, orderNumber: args.orderNumber, source: args.source },
    'Shiprocket shipment cancelled — detached from order, order status kept'
  );
  // Fire-and-forget: notification failure should not roll back the detach.
  void notifyShipmentDetached(args.orderNumber, args.source);
}

/**
 * Single point of persistence for every Shiprocket refresh — from
 * getTracking, the cron sweep, AND the webhook. Stamps lastShipmentSyncAt
 * unconditionally, upserts activities, persists status change when applicable,
 * and fires a Discord alert when the carrier reports a terminal CANCELLED
 * or RETURNED event (so ops doesn't miss carrier-driven cancellations).
 *
 * Returns true if order.status changed, false otherwise.
 */
async function syncTrackingState(
  orderId: string,
  args: {
    newStatus: OrderStatus | null;
    currentStatus: OrderStatus;
    activities: ParsedActivity[];
    shipmentStatusId?: number | string;
    shipmentStatusText?: string | number;
    source: 'tracking-read' | 'cron-refresh' | 'webhook';
    orderNumber: string;
  }
): Promise<boolean> {
  const statusChanged = args.newStatus !== null && args.newStatus !== args.currentStatus;
  const now = new Date();

  // Shiprocket "Cancelled" (ids 8/22) means the SHIPMENT was cancelled — not
  // the sale. Merchants legitimately cancel an SR shipment to re-ship through
  // another courier (2026-07: a live paid order was wrongly auto-CANCELLED
  // this way). Auto-cancelling here also never ran restock/refund/clawback,
  // so it produced half-cancelled orders even for real cancellations — those
  // must go through admin cancel. Instead: detach the dead shipment (null the
  // Shiprocket ids so the sweep and the AWB-reconcile pass can't resurrect
  // it), keep order.status, leave an audit row, and ping ops to re-ship or
  // cancel properly.
  if (args.newStatus === OrderStatus.CANCELLED && args.currentStatus !== OrderStatus.CANCELLED) {
    await detachCancelledShipment({
      orderId,
      currentStatus: args.currentStatus,
      orderNumber: args.orderNumber,
      source: args.source,
      detail: String(args.shipmentStatusText ?? `status_id=${args.shipmentStatusId ?? '?'}`),
    });
    return true;
  }

  const orderUpdate = statusChanged
    ? {
        status: args.newStatus as OrderStatus,
        lastShipmentSyncAt: now,
        // Stamp the delivery time when the carrier reports DELIVERED — anchors
        // the return window.
        ...(args.newStatus === OrderStatus.DELIVERED ? { deliveredAt: now } : {}),
      }
    : { lastShipmentSyncAt: now };

  const ops: any[] = [prisma.order.update({ where: { id: orderId }, data: orderUpdate })];

  if (statusChanged) {
    ops.push(
      prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: args.newStatus as OrderStatus,
          note: `Shiprocket ${args.source}: ${args.shipmentStatusText ?? `status_id=${args.shipmentStatusId ?? '?'}`}`,
        },
      })
    );
  }

  // Idempotent activity upsert — schema has @@unique([orderId, occurredAt, status])
  // so re-fetching the same Shiprocket response is a no-op for the timeline.
  for (const a of args.activities) {
    ops.push(
      prisma.orderTrackingActivity.upsert({
        where: {
          orderId_occurredAt_status: {
            orderId,
            occurredAt: a.occurredAt,
            status: a.status,
          },
        },
        create: {
          orderId,
          occurredAt: a.occurredAt,
          status: a.status,
          activity: a.activity || null,
          location: a.location || null,
        },
        update: {}, // first-write wins
      })
    );
  }

  await prisma.$transaction(ops);

  // Delivery-time money side effects — both idempotent, isolated so a
  // failure here never rolls back the status sync:
  //  - credit cashback (COD points vest when the carrier collects the cash;
  //    a prepaid order already credited at capture is skipped), and
  //  - settle the COD payment (PENDING → CAPTURED; prepaid is already
  //    CAPTURED so it's a no-op).
  if (statusChanged && args.newStatus === OrderStatus.DELIVERED) {
    try {
      await prisma.$transaction(async (tx) => {
        await awardOrderPoints(tx, orderId);
        await settleCodPaymentOnDelivery(tx, orderId);
      });
    } catch (err) {
      logger.error(
        { err, orderId, orderNumber: args.orderNumber },
        'Failed to award loyalty points / settle COD payment on delivery'
      );
    }
  }

  if (statusChanged) {
    logger.info(
      {
        orderId,
        orderNumber: args.orderNumber,
        newStatus: args.newStatus,
        source: args.source,
        srStatusId: args.shipmentStatusId,
        srStatusText: args.shipmentStatusText,
      },
      'Order status updated from Shiprocket'
    );

    if (args.newStatus && CARRIER_NOTIFY_STATUSES.has(args.newStatus)) {
      // Fire-and-forget: notification failure should not roll back the sync.
      void notifyCarrierTerminalEvent(args.orderNumber, args.newStatus, args.source);
    }
  }

  return statusChanged;
}

/**
 * Discord alert when a Shiprocket shipment is cancelled and detached from its
 * order — ops must either re-ship (any courier) or cancel the order in admin.
 */
async function notifyShipmentDetached(
  orderNumber: string,
  source: 'tracking-read' | 'cron-refresh' | 'webhook'
): Promise<void> {
  const webhookUrl = env.DISCORD_ORDER_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content:
          `:scissors: Shiprocket shipment for order \`${orderNumber}\` was cancelled ` +
          `(via ${source}). The shipment was detached — the order is **NOT** cancelled. ` +
          `Re-ship it (any courier) or cancel it properly in admin.`,
      }),
    });
  } catch (err) {
    logger.warn({ err, orderNumber }, 'Failed to post shipment-detached Discord alert');
  }
}

/**
 * Discord webhook alert for carrier-driven CANCELLED / RETURNED — gives ops
 * visibility into transitions that bypassed the admin "Update status" flow.
 */
async function notifyCarrierTerminalEvent(
  orderNumber: string,
  status: OrderStatus,
  source: 'tracking-read' | 'cron-refresh' | 'webhook'
): Promise<void> {
  const webhookUrl = env.DISCORD_ORDER_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `:rotating_light: Carrier-reported **${status}** for order \`${orderNumber}\` (via Shiprocket ${source}). No admin click triggered this — please review.`,
      }),
    });
  } catch (err) {
    logger.warn({ err, orderNumber, status }, 'Failed to post carrier-terminal Discord alert');
  }
}
