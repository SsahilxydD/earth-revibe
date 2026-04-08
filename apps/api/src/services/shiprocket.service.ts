import { prisma } from '@earth-revibe/db';
import { shiprocketRequest } from '../config/shiprocket';
import { env } from '../config/env';
import { APP_CONSTANTS } from '../config/constants';

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
    try {
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
    } catch {
      // If Shiprocket is down, fall back to basic serviceability
      return { serviceable: true, couriers: [] };
    }
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
   * Get tracking info for an order.
   */
  async getTracking(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { awbCode: true, courierName: true, trackingUrl: true },
    });

    if (!order?.awbCode) {
      return { tracked: false, awbCode: null, activities: [] };
    }

    try {
      const result = await shiprocketRequest<any>(`/courier/track/awb/${order.awbCode}`);

      const trackingData = result.tracking_data || {};
      return {
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
    } catch {
      return {
        tracked: true,
        awbCode: order.awbCode,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl,
        activities: [],
      };
    }
  },
};
