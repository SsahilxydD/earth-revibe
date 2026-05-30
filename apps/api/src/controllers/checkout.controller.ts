import type { Request, Response } from 'express';
import { checkoutService, createCodOrder } from '../services/checkout.service';
import { getRazorpay } from '../config/razorpay';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const checkoutController = {
  // Public, unauthenticated. Single source of truth for storefront-visible
  // checkout config (currently just the COD fee) so the UI never shows a fee
  // that differs from what the server actually charges in createCodOrder.
  async getConfig(_req: Request, res: Response) {
    res.json({ success: true, data: { codFee: env.COD_FEE || 0 } });
  },

  async createMagicOrder(req: Request, res: Response) {
    const userId = req.user?.id ?? null;

    // Magic Checkout: Razorpay collects email during payment,
    // so guest checkout no longer requires email upfront.
    const result = await checkoutService.createMagicOrder(userId, req.body);
    res.status(201).json({ success: true, data: result });
  },

  /**
   * Called by Razorpay's servers — no user auth.
   *
   * CRITICAL: must ALWAYS respond 200 with a valid shape. A single non-200
   * can flip Razorpay's circuit breaker and silently disable our URL —
   * when that happens, no future checkouts see COD or custom shipping.
   */
  async shippingInfo(req: Request, res: Response) {
    logger.info(
      { body: req.body, sig: req.headers['x-razorpay-signature'] ? 'present' : 'missing' },
      'razorpay.shipping-info received'
    );
    try {
      const result = await checkoutService.getShippingInfo(req.body);
      res.json(result);
    } catch (err) {
      // Never 500 Razorpay. Fall back to an empty-but-valid shape so the
      // circuit breaker stays closed. We still log the failure for us.
      logger.error({ err, body: req.body }, 'razorpay.shipping-info handler crashed');
      res.json({ addresses: [] });
    }
  },

  /** Called by Razorpay's servers — no user auth */
  async getPromotions(req: Request, res: Response) {
    logger.info({ body: req.body }, 'razorpay.promotions received');
    try {
      const result = await checkoutService.getPromotions(req.body);
      res.json(result);
    } catch (err) {
      logger.error({ err, body: req.body }, 'razorpay.promotions handler crashed');
      res.json({ promotions: [] });
    }
  },

  /** Called by Razorpay's servers — no user auth */
  async applyPromotion(req: Request, res: Response) {
    logger.info({ body: req.body }, 'razorpay.promotions.apply received');
    try {
      const result = await checkoutService.applyPromotion(req.body);
      // If there's an error, Razorpay expects a 200 with error object
      res.json(result);
    } catch (err) {
      logger.error({ err, body: req.body }, 'razorpay.promotions.apply handler crashed');
      res.json({ promotion_not_applicable: true });
    }
  },

  /**
   * Create a temporary ₹1 Magic Checkout order for address collection.
   * Razorpay handles phone → OTP → address. When the user dismisses the
   * modal (or completes), the frontend captures the address from the
   * Razorpay response. The ₹1 order is never fulfilled.
   */
  async createAddressCollectionOrder(_req: Request, res: Response) {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: 100, // ₹1 in paise — minimum amount for Magic Checkout
      currency: 'INR',
      receipt: `addr_${Date.now()}`,
      line_items_total: 100,
      line_items: [
        {
          type: 'e-commerce' as any,
          sku: 'address-collection',
          name: 'Address Verification',
          description: 'Verify your address',
          quantity: 1,
          price: 100,
          offer_price: 100,
        },
      ],
      notes: { purpose: 'address_collection' },
    } as any);

    res.json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        amount: 100,
      },
    });
  },

  /**
   * Extract shipping address from a Razorpay order (used after address-collection).
   * Fetches the full order from Razorpay API and returns the shipping address.
   */
  async getOrderAddress(req: Request, res: Response) {
    const razorpayOrderId = req.params.razorpayOrderId as string;
    if (!razorpayOrderId) {
      res
        .status(400)
        .json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing order ID' } });
      return;
    }

    const razorpay = getRazorpay();
    const order = (await razorpay.orders.fetch(razorpayOrderId)) as any;

    // Extract the customer's shipping address from Razorpay's order data
    const customerDetails = order.customer_details || {};
    const shippingAddress = customerDetails.shipping_address || {};

    if (!shippingAddress.line1 && !shippingAddress.city) {
      res.json({ success: true, data: { address: null } });
      return;
    }

    res.json({
      success: true,
      data: {
        address: {
          fullName: shippingAddress.name || customerDetails.name || '',
          phone: (customerDetails.contact || '').replace(/^\+91/, ''),
          line1: shippingAddress.line1 || '',
          line2: shippingAddress.line2 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          pinCode: shippingAddress.zipcode || '',
        },
      },
    });
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = req.user?.id ?? null;
    const result = await checkoutService.verifyMagicPayment(userId, req.body);
    res.json({ success: true, data: result });
  },

  async createCodOrderHandler(req: Request, res: Response) {
    const result = await createCodOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  },

  /**
   * Razorpay COD Review API — called by Razorpay before confirming a COD order.
   * Responds with { status: "accept" } or { status: "reject", reason: "..." }.
   *
   * CRITICAL — this endpoint FAILS OPEN. A non-200 (or {status:'reject'}) here
   * can make Razorpay disable COD for the order entirely ("Cash on delivery is
   * not available for this order"). So when the optional Basic Auth creds are
   * unset, or the credentials don't match, we LOG and still return
   * 200 {status:'accept'} rather than gating COD on a config gap. This only
   * affects whether COD is *offered* — it never moves money: capture and order
   * finalization still pass the strict HMAC check in verifyMagicPayment.
   *
   * TODO: once RAZORPAY_COD_REVIEW_USERNAME/PASSWORD are set in prod AND real
   * review logic exists (block high-value / repeat-RTO addresses), tighten this
   * back up to reject on genuine credential mismatch.
   */
  async reviewCodOrder(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    const expectedUser = env.RAZORPAY_COD_REVIEW_USERNAME;
    const expectedPass = env.RAZORPAY_COD_REVIEW_PASSWORD;

    // No creds configured → can't (and shouldn't) gate. Accept + log.
    if (!expectedUser || !expectedPass) {
      logger.warn(
        'razorpay.review-order: COD review creds not configured — accepting (fail-open) so COD stays available'
      );
      res.json({ status: 'accept' });
      return;
    }

    // Creds are configured: verify, but still fail OPEN on mismatch (log loudly)
    // so a credential drift between Razorpay and Railway can't silently kill COD.
    const decoded = authHeader?.startsWith('Basic ')
      ? Buffer.from(authHeader.slice(6), 'base64').toString()
      : '';
    const [user, pass] = decoded.split(':');
    if (user !== expectedUser || pass !== expectedPass) {
      logger.error(
        { authPresent: !!authHeader },
        'razorpay.review-order: Basic Auth mismatch — accepting anyway (fail-open) to avoid disabling COD; check dashboard creds vs RAZORPAY_COD_REVIEW_*'
      );
      res.json({ status: 'accept' });
      return;
    }

    // Authenticated. Accept the COD order — add rejection logic here later
    // (e.g., block high-value orders, repeat RTO addresses, etc.)
    res.json({ status: 'accept' });
  },
};
