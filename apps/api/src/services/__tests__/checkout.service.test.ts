import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Hoisted mock variables — must come before any vi.mock() calls
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  // ── tx-level mock fns (shared between top-level prisma and the tx client) ──
  const txVariantFindUnique = vi.fn();
  const txVariantUpdateMany = vi.fn();
  const txVariantUpdate = vi.fn();
  const txPendingCheckoutCreate = vi.fn();
  const txPendingCheckoutDelete = vi.fn();
  const txOrderCreate = vi.fn();
  const txOrderUpdate = vi.fn();
  const txOrderCount = vi.fn();
  const txDiscountCodeUpdate = vi.fn();
  const txUserUpdate = vi.fn();
  const txLoyaltyTransactionCreate = vi.fn();
  const txReferralFindUnique = vi.fn();
  const txReferralUpdate = vi.fn();
  const txCartFindUnique = vi.fn();
  const txCartItemDeleteMany = vi.fn();

  return {
    // ── top-level prisma table mocks ──────────────────────────────────────
    productVariant: {
      findMany: vi.fn(),
      findUnique: txVariantFindUnique,
      updateMany: txVariantUpdateMany,
      update: txVariantUpdate,
    },
    product: { findMany: vi.fn() },
    discountCode: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    loyaltyConfig: { findFirst: vi.fn() },
    order: { count: vi.fn() },
    pendingCheckout: {
      create: txPendingCheckoutCreate,
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: txPendingCheckoutDelete,
    },
    address: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    // ── transaction ───────────────────────────────────────────────────────
    $transaction: vi.fn(),

    // ── tx client (used inside $transaction callbacks) ───────────────────
    txClient: {
      productVariant: {
        findUnique: txVariantFindUnique,
        updateMany: txVariantUpdateMany,
        update: txVariantUpdate,
      },
      pendingCheckout: {
        create: txPendingCheckoutCreate,
        delete: txPendingCheckoutDelete,
      },
      order: {
        create: txOrderCreate,
        update: txOrderUpdate,
        count: txOrderCount,
      },
      discountCode: { update: txDiscountCodeUpdate },
      user: { update: txUserUpdate },
      loyaltyTransaction: { create: txLoyaltyTransactionCreate },
      referral: {
        findUnique: txReferralFindUnique,
        update: txReferralUpdate,
      },
      cart: { findUnique: txCartFindUnique },
      cartItem: { deleteMany: txCartItemDeleteMany },
    },

    // ── named tx-level fns (for direct assertion) ─────────────────────────
    txVariantFindUnique,
    txVariantUpdateMany,
    txVariantUpdate,
    txPendingCheckoutCreate,
    txPendingCheckoutDelete,
    txOrderCreate,
    txOrderUpdate,
    txOrderCount,
    txDiscountCodeUpdate,
    txUserUpdate,
    txLoyaltyTransactionCreate,
    txReferralFindUnique,
    txReferralUpdate,
    txCartFindUnique,
    txCartItemDeleteMany,

    // ── razorpay ──────────────────────────────────────────────────────────
    razorpayOrdersCreate: vi.fn(),
    razorpayOrdersFetch: vi.fn(),

    // ── shared ────────────────────────────────────────────────────────────
    generateOrderNumber: vi.fn(() => 'ORD-TEST-001'),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    productVariant: mocks.productVariant,
    product: mocks.product,
    discountCode: mocks.discountCode,
    user: mocks.user,
    loyaltyConfig: mocks.loyaltyConfig,
    order: mocks.order,
    pendingCheckout: mocks.pendingCheckout,
    address: mocks.address,
    $transaction: mocks.$transaction,
  },
  Prisma: {
    TransactionIsolationLevel: { Serializable: 'Serializable' },
  },
}));

vi.mock('../../config/razorpay', () => ({
  getRazorpay: vi.fn(() => ({
    orders: {
      create: mocks.razorpayOrdersCreate,
      fetch: mocks.razorpayOrdersFetch,
    },
  })),
}));

vi.mock('../../config/env', () => ({
  env: { RAZORPAY_KEY_ID: 'test_key', RAZORPAY_KEY_SECRET: 'test_secret' },
}));

vi.mock('../../config/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../config/constants', () => ({
  APP_CONSTANTS: {
    CHECKOUT_EXPIRY_MS: 7_200_000, // 2 hours
    REFERRER_REWARD_POINTS: 100,
    REFEREE_REWARD_POINTS: 50,
  },
}));

vi.mock('@earth-revibe/shared', () => ({
  generateOrderNumber: mocks.generateOrderNumber,
}));

vi.mock('../shiprocket.service', () => ({
  shiprocketService: {
    createShiprocketOrder: vi.fn(() => Promise.resolve()),
  },
}));

// ---------------------------------------------------------------------------
// Subject under test — imported AFTER all vi.mock() calls
// ---------------------------------------------------------------------------

import { checkoutService, restoreExpiredReservations } from '../checkout.service';
import { ApiError } from '../../utils/api-error';

// ---------------------------------------------------------------------------
// Fixed date constant (avoids test-time drift)
// ---------------------------------------------------------------------------
const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');

// ---------------------------------------------------------------------------
// Fixture factories — always return new objects (immutable pattern)
// ---------------------------------------------------------------------------

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'variant-1',
    size: 'M',
    color: 'Black',
    stock: 10,
    price: 500,
    product: {
      id: 'product-1',
      name: 'Test Tee',
      slug: 'test-tee',
      price: 500,
      categoryId: 'cat-1',
      images: [{ url: 'https://cdn.example.com/img.jpg', isPrimary: true }],
    },
    ...overrides,
  };
}

function makeDiscount(overrides: Record<string, unknown> = {}) {
  // Use wall-clock relative times so the discount is always "active" by default.
  // Individual tests override startsAt/expiresAt to test expiry scenarios.
  const now = Date.now();
  return {
    id: 'dc-1',
    code: 'SAVE10',
    type: 'PERCENTAGE',
    value: 10,
    isActive: true,
    startsAt: new Date(now - 86_400_000), // started 1 day ago
    expiresAt: new Date(now + 86_400_000), // expires 1 day from now
    usageLimit: null,
    usageCount: 0,
    perUserLimit: 1,
    minOrderValue: null,
    maxDiscountAmount: null,
    applicableProducts: [],
    applicableCategories: [],
    ...overrides,
  };
}

function makeCheckoutInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ variantId: 'variant-1', quantity: 2 }],
    discountCode: null,
    loyaltyPointsToUse: 0,
    guestEmail: null,
    ...overrides,
  };
}

function makeRazorpayOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rzp_order_abc123',
    amount: 100_000,
    currency: 'INR',
    receipt: 'ORD-TEST-001',
    ...overrides,
  };
}

function makePendingCheckout(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pc-1',
    orderNumber: 'ORD-TEST-001',
    userId: 'user-1',
    guestEmail: null,
    razorpayOrderId: 'rzp_order_abc123',
    discountCode: null,
    loyaltyPointsToUse: 0,
    subtotal: 1000,
    discountAmount: 0,
    loyaltyDiscount: 0,
    itemsJson: JSON.stringify([{ variantId: 'variant-1', quantity: 2 }]),
    stockReserved: true,
    reservedAt: FIXED_DATE,
    createdAt: FIXED_DATE,
    ...overrides,
  };
}

function makeAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr-1',
    userId: 'user-1',
    label: 'Home',
    fullName: 'Test User',
    phone: '9876543210',
    line1: '123 Test St',
    line2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
    isDefault: true,
    ...overrides,
  };
}

function makeVerifyInput(overrides: Record<string, unknown> = {}) {
  // Generate a real HMAC so the signature check passes
  const orderId = 'rzp_order_abc123';
  const paymentId = 'pay_test_001';
  const body = orderId + '|' + paymentId;
  const sig = crypto.createHmac('sha256', 'test_secret').update(body).digest('hex');
  return {
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: sig,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Transaction helper: runs the callback synchronously with the mock tx client.
// Used for createMagicOrder's Serializable $transaction.
// ---------------------------------------------------------------------------
function setupCreateTransaction() {
  mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown, _opts?: unknown) =>
    fn(mocks.txClient)
  );
}

// Full tx client for verifyMagicPayment (has order, discountCode, user, etc.)
function setupVerifyTransaction() {
  mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown) => fn(mocks.txClient));
}

// ---------------------------------------------------------------------------
// Reset all mocks before every test — prevents state leakage
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
  // Re-wire generateOrderNumber after reset
  mocks.generateOrderNumber.mockReturnValue('ORD-TEST-001');
});

// ===========================================================================
// createMagicOrder
// ===========================================================================

describe('checkoutService.createMagicOrder', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Guest checkout validation
  // ─────────────────────────────────────────────────────────────────────────

  describe('guest checkout — email handling', () => {
    it('proceeds without guestEmail for guest checkout (Magic Checkout collects email during payment)', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({ guestEmail: null });

      const result = await checkoutService.createMagicOrder(null, input as any);

      expect(result).toHaveProperty('razorpayOrderId');
      expect(mocks.productVariant.findMany).toHaveBeenCalled();
    });

    it('uses provided guestEmail for prefill when available', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const err = await checkoutService.createMagicOrder(
        null,
        makeCheckoutInput({ guestEmail: 'guest@example.com' }) as any
      );

      expect(err.prefill.email).toBe('guest@example.com');
    });

    it('proceeds past email check when guestEmail is provided', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({ guestEmail: 'guest@example.com' });

      const result = await checkoutService.createMagicOrder(null, input as any);

      expect(result).toHaveProperty('razorpayOrderId');
      expect(result.prefill.email).toBe('guest@example.com');
    });

    it('uses empty string for prefill.name and empty contact for guest users', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const result = await checkoutService.createMagicOrder(
        null,
        makeCheckoutInput({ guestEmail: 'g@x.com' }) as any
      );

      expect(result.prefill).toEqual({ name: '', email: 'g@x.com', contact: '' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Variant validation
  // ─────────────────────────────────────────────────────────────────────────

  describe('variant availability validation', () => {
    it('throws 400 when a requested variant is not found in DB', async () => {
      // Only 1 variant returned for 2 requested
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant({ id: 'variant-1' })]);

      const input = makeCheckoutInput({
        items: [
          { variantId: 'variant-1', quantity: 1 },
          { variantId: 'variant-MISSING', quantity: 1 },
        ],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).rejects.toMatchObject({
        statusCode: 400,
        message: 'One or more items are no longer available',
      });
    });

    it('proceeds when all requested variants are found', async () => {
      const v1 = makeVariant({ id: 'variant-1' });
      const v2 = makeVariant({
        id: 'variant-2',
        product: { ...makeVariant().product, id: 'product-2' },
      });
      mocks.productVariant.findMany.mockResolvedValueOnce([v1, v2]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2);
      mocks.txVariantUpdateMany.mockResolvedValue({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({
        items: [
          { variantId: 'variant-1', quantity: 1 },
          { variantId: 'variant-2', quantity: 1 },
        ],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).resolves.toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Stock validation (pre-transaction check)
  // ─────────────────────────────────────────────────────────────────────────

  describe('stock quantity validation — pre-transaction', () => {
    it('throws 400 when quantity exceeds available stock', async () => {
      const variant = makeVariant({ stock: 3 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);

      const input = makeCheckoutInput({
        items: [{ variantId: 'variant-1', quantity: 5 }],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('only has 3 in stock'),
      });
    });

    it('throws 400 when quantity exceeds stock by exactly one', async () => {
      const variant = makeVariant({ stock: 4 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);

      const input = makeCheckoutInput({
        items: [{ variantId: 'variant-1', quantity: 5 }],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('allows order when quantity exactly equals available stock', async () => {
      const variant = makeVariant({ stock: 2 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).resolves.toBeDefined();
    });

    it('includes variant name and stock count in the stock error message', async () => {
      const variant = makeVariant({
        stock: 1,
        product: { ...makeVariant().product, name: 'Eco Tee' },
      });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);

      const err = await checkoutService
        .createMagicOrder(
          'user-1',
          makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 5 }] }) as any
        )
        .catch((e) => e);

      expect(err.message).toContain('Eco Tee');
      expect(err.message).toContain('1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Price calculation
  // ─────────────────────────────────────────────────────────────────────────

  describe('price calculation', () => {
    it('uses variant.price when it is non-zero', async () => {
      const variant = makeVariant({
        price: 750,
        product: { ...makeVariant().product, price: 500 },
      });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 1 }] });

      await checkoutService.createMagicOrder('user-1', input as any);

      // 750 * 1 = 750 INR → 75000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 75_000 })
      );
    });

    it('falls back to product.price when variant.price is 0', async () => {
      const variant = makeVariant({ price: 0, product: { ...makeVariant().product, price: 600 } });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 2 }] });

      await checkoutService.createMagicOrder('user-1', input as any);

      // 600 * 2 = 1200 INR → 120000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 120_000 })
      );
    });

    it('accumulates line-item totals correctly across multiple variants', async () => {
      const v1 = makeVariant({ id: 'variant-1', price: 500 });
      const v2 = makeVariant({
        id: 'variant-2',
        price: 300,
        product: { ...makeVariant().product, id: 'product-2' },
      });
      mocks.productVariant.findMany.mockResolvedValueOnce([v1, v2]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(v1).mockResolvedValueOnce(v2);
      mocks.txVariantUpdateMany.mockResolvedValue({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({
        items: [
          { variantId: 'variant-1', quantity: 2 }, // 1000
          { variantId: 'variant-2', quantity: 1 }, // 300
        ],
      });

      await checkoutService.createMagicOrder('user-1', input as any);

      // 1300 INR → 130000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 130_000 })
      );
    });

    it('sends line_items with prices in paise to Razorpay', async () => {
      const variant = makeVariant({ price: 499 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 1 }] });
      await checkoutService.createMagicOrder('user-1', input as any);

      const lineItem = mocks.razorpayOrdersCreate.mock.calls[0][0].line_items[0];
      expect(lineItem.price).toBe(49_900);
      expect(lineItem.offer_price).toBe(49_900);
    });

    it('passes line_items_total separately from order amount', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any);

      const call = mocks.razorpayOrdersCreate.mock.calls[0][0];
      // qty=2 * 500 = 1000 INR → 100000 paise
      expect(call.line_items_total).toBe(100_000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Discount code — calculateDiscount helper
  // ─────────────────────────────────────────────────────────────────────────

  describe('discount code application', () => {
    async function applyWithDiscount(discountOverrides: Record<string, unknown> = {}, qty = 2) {
      const variant = makeVariant({ price: 500 });
      const discount = makeDiscount(discountOverrides);

      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(discount);
      mocks.order.count.mockResolvedValueOnce(0);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      return checkoutService.createMagicOrder(
        'user-1',
        makeCheckoutInput({
          discountCode: 'SAVE10',
          items: [{ variantId: 'variant-1', quantity: qty }],
        }) as any
      );
    }

    it('applies PERCENTAGE discount correctly', async () => {
      await applyWithDiscount({ type: 'PERCENTAGE', value: 10 });

      // subtotal=1000, 10% = 100 → total 900 → 90000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 90_000 })
      );
    });

    it('caps PERCENTAGE discount at maxDiscountAmount when limit is set', async () => {
      // 20% of 1000 = 200, capped at 150
      await applyWithDiscount({ type: 'PERCENTAGE', value: 20, maxDiscountAmount: 150 });

      // 1000 - 150 = 850 → 85000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 85_000 })
      );
    });

    it('does NOT cap PERCENTAGE discount when actual discount is below maxDiscountAmount', async () => {
      // 5% of 1000 = 50, max is 200 — no capping needed
      await applyWithDiscount({ type: 'PERCENTAGE', value: 5, maxDiscountAmount: 200 });

      // 1000 - 50 = 950 → 95000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 95_000 })
      );
    });

    it('applies FLAT discount correctly', async () => {
      await applyWithDiscount({ type: 'FLAT', value: 200 });

      // 1000 - 200 = 800 → 80000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 80_000 })
      );
    });

    it('caps FLAT discount at subtotal to prevent negative total', async () => {
      // Flat 1500 > subtotal 1000 → discount capped at 1000 → total 0
      await applyWithDiscount({ type: 'FLAT', value: 1500 });

      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 })
      );
    });

    it('applies FREE_SHIPPING discount as zero monetary reduction', async () => {
      await applyWithDiscount({ type: 'FREE_SHIPPING' });

      // No monetary change → 1000 INR → 100000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100_000 })
      );
    });

    it('applies 0 discount for BUY_X_GET_Y type (silently skipped in v1)', async () => {
      await applyWithDiscount({ type: 'BUY_X_GET_Y', value: 10 });

      // BUY_X_GET_Y yields discountAmount=0 — full price charged (1000 INR = 100000 paise for qty 2 * 500)
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100_000 })
      );
    });

    it('throws 400 when discount code does not exist', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(null);

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'FAKE' }) as any
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid discount code' });
    });

    it('throws 400 when discount code is inactive', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(makeDiscount({ isActive: false }));

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid discount code' });
    });

    it('throws 400 when discount code has expired (expiresAt in the past)', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ expiresAt: new Date(Date.now() - 86_400_000) })
      );

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Discount code has expired' });
    });

    it('throws 400 when discount code has not started yet (startsAt in the future)', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ startsAt: new Date(Date.now() + 86_400_000) })
      );

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Discount code has expired' });
    });

    it('throws 400 when global usage limit is reached', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ usageLimit: 100, usageCount: 100 })
      );

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Discount code usage limit reached',
      });
    });

    it('throws 400 when per-user limit is exceeded (user already used it)', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(makeDiscount({ perUserLimit: 1 }));
      mocks.order.count.mockResolvedValueOnce(1); // already used once

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('maximum number of times'),
      });
    });

    it('throws 400 when subtotal is below the minimum order value', async () => {
      const variant = makeVariant({ price: 200 }); // subtotal = 400 for qty 2
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(makeDiscount({ minOrderValue: 500 }));
      mocks.order.count.mockResolvedValueOnce(0);

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({
            discountCode: 'SAVE10',
            items: [{ variantId: 'variant-1', quantity: 2 }],
          }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Minimum order value'),
      });
    });

    it('throws 400 when none of the cart products are in applicableProducts', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ applicableProducts: ['product-OTHER'] })
      );
      mocks.order.count.mockResolvedValueOnce(0);

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This discount code is not applicable to the items in your cart',
      });
    });

    it('throws 400 when none of the cart categories are in applicableCategories', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ applicableCategories: ['cat-OTHER'] })
      );
      mocks.order.count.mockResolvedValueOnce(0);

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This discount code is not applicable to the items in your cart',
      });
    });

    it('allows discount when cart product is in applicableProducts list', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ type: 'FLAT', value: 50, applicableProducts: ['product-1'] })
      );
      mocks.order.count.mockResolvedValueOnce(0);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ discountCode: 'SAVE10' }) as any
        )
      ).resolves.toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Loyalty points
  // ─────────────────────────────────────────────────────────────────────────

  describe('loyalty points', () => {
    function setupHappyPath(variant: ReturnType<typeof makeVariant>) {
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
    }

    it('skips loyalty points for guest users even when loyaltyPointsToUse > 0', async () => {
      const variant = makeVariant({ price: 500 });
      setupHappyPath(variant);
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({
        guestEmail: 'guest@example.com',
        loyaltyPointsToUse: 200,
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      const result = await checkoutService.createMagicOrder(null, input as any);

      // No loyalty discount → total stays 1000 → 100000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100_000 })
      );
      expect(result).toHaveProperty('razorpayOrderId');
    });

    it('stores loyaltyPointsToUse=0 in pendingCheckout for guest users', async () => {
      const variant = makeVariant();
      setupHappyPath(variant);
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const input = makeCheckoutInput({
        guestEmail: 'g@x.com',
        loyaltyPointsToUse: 999,
      });

      await checkoutService.createMagicOrder(null, input as any);

      expect(mocks.txPendingCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ loyaltyPointsToUse: 0 }),
        })
      );
    });

    it('throws 400 when authenticated user has insufficient loyalty points', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.user.findUnique.mockResolvedValueOnce({ id: 'user-1', loyaltyPoints: 50 });

      const input = makeCheckoutInput({
        loyaltyPointsToUse: 200,
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Insufficient loyalty points',
      });
    });

    it('throws 400 when user does not exist but loyaltyPointsToUse > 0', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ loyaltyPointsToUse: 100 }) as any
        )
      ).rejects.toMatchObject({ statusCode: 400, message: 'Insufficient loyalty points' });
    });

    it('throws 400 when points are below minimum redemption threshold', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.user.findUnique.mockResolvedValueOnce({ id: 'user-1', loyaltyPoints: 500 });
      mocks.loyaltyConfig.findFirst.mockResolvedValueOnce({ isActive: true, minRedeemPoints: 100 });

      const input = makeCheckoutInput({
        loyaltyPointsToUse: 50, // below threshold
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      await expect(checkoutService.createMagicOrder('user-1', input as any)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('100 points required'),
      });
    });

    it('applies loyalty discount for authenticated users with sufficient points', async () => {
      const variant = makeVariant({ price: 500 });
      setupHappyPath(variant);
      mocks.user.findUnique.mockResolvedValueOnce({ id: 'user-1', loyaltyPoints: 500 });
      mocks.loyaltyConfig.findFirst.mockResolvedValueOnce({ isActive: true, minRedeemPoints: 10 });

      const input = makeCheckoutInput({
        loyaltyPointsToUse: 200,
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      await checkoutService.createMagicOrder('user-1', input as any);

      // 1000 - 200 = 800 → 80000 paise
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 80_000 })
      );
    });

    it('caps loyalty discount at (lineItemsTotal - discountAmount) to prevent overpaying', async () => {
      // subtotal=1000, flat discount=600, max loyalty=400, user requests 700
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ type: 'FLAT', value: 600 })
      );
      mocks.order.count.mockResolvedValueOnce(0);
      mocks.user.findUnique.mockResolvedValueOnce({ id: 'user-1', loyaltyPoints: 1000 });
      mocks.loyaltyConfig.findFirst.mockResolvedValueOnce({ isActive: true, minRedeemPoints: 10 });
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});

      const input = makeCheckoutInput({
        discountCode: 'SAVE10',
        loyaltyPointsToUse: 700,
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      await checkoutService.createMagicOrder('user-1', input as any);

      // subtotal=1000, flat=600, maxLoyalty=400, loyaltyUsed=min(700,400)=400 → total=0
      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Total never negative
  // ─────────────────────────────────────────────────────────────────────────

  describe('total amount — never negative', () => {
    it('clamps total to 0 when discounts exceed subtotal', async () => {
      const variant = makeVariant({ price: 100 }); // subtotal = 200 for qty 2
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      // FLAT discount = 150, leaving 50; loyalty 100 would exceed remainder
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ type: 'FLAT', value: 150 })
      );
      mocks.order.count.mockResolvedValueOnce(0);
      mocks.user.findUnique.mockResolvedValueOnce({ id: 'user-1', loyaltyPoints: 1000 });
      mocks.loyaltyConfig.findFirst.mockResolvedValueOnce({ isActive: true, minRedeemPoints: 1 });
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});

      const input = makeCheckoutInput({
        discountCode: 'SAVE10',
        loyaltyPointsToUse: 100,
        items: [{ variantId: 'variant-1', quantity: 2 }],
      });

      await checkoutService.createMagicOrder('user-1', input as any);

      expect(mocks.razorpayOrdersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 })
      );
    });

    it('passes amount=0 in paise (not a negative value) when fully discounted', async () => {
      const variant = makeVariant({ price: 50 }); // subtotal 100
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.product.findMany.mockResolvedValueOnce([{ id: 'product-1', categoryId: 'cat-1' }]);
      mocks.discountCode.findUnique.mockResolvedValueOnce(
        makeDiscount({ type: 'FLAT', value: 999 })
      );
      mocks.order.count.mockResolvedValueOnce(0);
      mocks.user.findUnique.mockResolvedValueOnce(null);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});

      await checkoutService.createMagicOrder(
        'user-1',
        makeCheckoutInput({
          discountCode: 'SAVE10',
          items: [{ variantId: 'variant-1', quantity: 2 }],
        }) as any
      );

      const callArg = mocks.razorpayOrdersCreate.mock.calls[0][0];
      expect(callArg.amount).toBeGreaterThanOrEqual(0);
      expect(callArg.amount).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Serializable transaction — stock reservation & price revalidation
  // ─────────────────────────────────────────────────────────────────────────

  describe('stock reservation transaction (Serializable isolation)', () => {
    it('throws CONFLICT 409 when price changes between pre-check and transaction', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());

      // Inside tx: variant price has changed
      const updatedVariant = makeVariant({
        price: 600,
        product: { ...makeVariant().product, price: 600 },
      });
      mocks.txVariantFindUnique.mockResolvedValueOnce(updatedVariant);
      mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown, _opts?: unknown) =>
        fn(mocks.txClient)
      );

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 2 }] }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('Price changed'),
      });
    });

    it('throws CONFLICT 409 when stock drops below requested quantity inside transaction', async () => {
      const variant = makeVariant({ price: 500, stock: 10 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());

      // Inside tx: stock has been depleted
      const depleted = makeVariant({ price: 500, stock: 1 });
      mocks.txVariantFindUnique.mockResolvedValueOnce(depleted);
      mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown, _opts?: unknown) =>
        fn(mocks.txClient)
      );

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 5 }] }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('Insufficient stock'),
      });
    });

    it('throws CONFLICT 409 when updateMany returns count=0 (concurrent reservation race)', async () => {
      const variant = makeVariant({ price: 500, stock: 10 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());

      // findUnique is fine but updateMany fails (another request grabbed last stock)
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 0 });
      mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown, _opts?: unknown) =>
        fn(mocks.txClient)
      );

      await expect(
        checkoutService.createMagicOrder(
          'user-1',
          makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 2 }] }) as any
        )
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('Stock reservation failed'),
      });
    });

    it('throws 400 when variant is no longer available inside transaction', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());

      // Inside tx: variant was deleted
      mocks.txVariantFindUnique.mockResolvedValueOnce(null);
      mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown, _opts?: unknown) =>
        fn(mocks.txClient)
      );

      await expect(
        checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Product variant is no longer available',
      });
    });

    it('creates pendingCheckout with stockReserved=true inside transaction', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any);

      expect(mocks.txPendingCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stockReserved: true,
            orderNumber: 'ORD-TEST-001',
          }),
        })
      );
    });

    it('passes Serializable isolation level to $transaction', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any);

      expect(mocks.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' })
      );
    });

    it('decrements stock with a conditional filter to prevent over-reservation', async () => {
      const variant = makeVariant({ price: 500, stock: 10 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await checkoutService.createMagicOrder(
        'user-1',
        makeCheckoutInput({ items: [{ variantId: 'variant-1', quantity: 3 }] }) as any
      );

      expect(mocks.txVariantUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'variant-1',
            stock: { gte: 3 },
          }),
          data: { stock: { decrement: 3 } },
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Return value
  // ─────────────────────────────────────────────────────────────────────────

  describe('return value', () => {
    it('returns razorpayOrderId, razorpayKeyId, amount, orderNumber and prefill', async () => {
      const variant = makeVariant({ price: 500 });
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder({ id: 'rzp_order_xyz' }));
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const result = await checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any);

      expect(result).toMatchObject({
        razorpayOrderId: 'rzp_order_xyz',
        razorpayKeyId: 'test_key',
        orderNumber: 'ORD-TEST-001',
        prefill: expect.any(Object),
      });
    });

    it('populates prefill from DB user record for authenticated users', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce({
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        phone: '9876543210',
      });

      const result = await checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any);

      expect(result.prefill).toEqual({
        name: 'Alice Smith',
        email: 'alice@example.com',
        contact: '9876543210',
      });
    });

    it('uses guestEmail as prefill.email and empty name/contact for guest users', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      const result = await checkoutService.createMagicOrder(
        null,
        makeCheckoutInput({ guestEmail: 'guest@x.com' }) as any
      );

      expect(result.prefill).toEqual({ name: '', email: 'guest@x.com', contact: '' });
    });

    it('uses empty string for contact when user has no phone', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce({
        email: 'bob@x.com',
        firstName: 'Bob',
        lastName: '',
        phone: null,
      });

      const result = await checkoutService.createMagicOrder('user-1', makeCheckoutInput() as any);

      expect(result.prefill.contact).toBe('');
    });

    it('stores razorpay notes with correct userId and guestEmail fields', async () => {
      const variant = makeVariant();
      mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
      mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
      setupCreateTransaction();
      mocks.txVariantFindUnique.mockResolvedValueOnce(variant);
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txPendingCheckoutCreate.mockResolvedValueOnce({});
      mocks.user.findUnique.mockResolvedValueOnce(null);

      await checkoutService.createMagicOrder(
        null,
        makeCheckoutInput({ guestEmail: 'g@x.com' }) as any
      );

      const notes = mocks.razorpayOrdersCreate.mock.calls[0][0].notes;
      expect(notes.userId).toBe('guest');
      expect(notes.guestEmail).toBe('g@x.com');
    });
  });
});

// ===========================================================================
// getShippingInfo
// ===========================================================================

describe('checkoutService.getShippingInfo', () => {
  it('marks India (IN) addresses as serviceable (address-level AND shipping_methods)', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ id: 'addr-1', zipcode: '400001', country: 'IN' }],
    } as any);

    // Razorpay's parser reads from the ADDRESS level, so this is the one that matters.
    expect(result.addresses[0].serviceable).toBe(true);
    expect(result.addresses[0].cod).toBe(true);
    // shipping_methods kept in sync for backwards compat.
    expect(result.addresses[0].shipping_methods[0].serviceable).toBe(true);
  });

  it('marks non-IN addresses as NOT serviceable', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ id: 'addr-2', zipcode: '10001', country: 'US' }],
    } as any);

    expect(result.addresses[0].serviceable).toBe(false);
    expect(result.addresses[0].cod).toBe(false);
    expect(result.addresses[0].shipping_methods[0].serviceable).toBe(false);
  });

  it('returns shipping_fee=0 for all addresses (address-level AND shipping_methods)', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [
        { id: 'a', zipcode: '400001', country: 'IN' },
        { id: 'b', zipcode: '10001', country: 'US' },
      ],
    } as any);

    result.addresses.forEach((addr: any) => {
      expect(addr.shipping_fee).toBe(0);
      expect(addr.shipping_methods[0].shipping_fee).toBe(0);
    });
  });

  it('maps each address id correctly in the response', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [
        { id: 'addr-A', zipcode: '110001', country: 'IN' },
        { id: 'addr-B', zipcode: 'W1A 1AA', country: 'GB' },
      ],
    } as any);

    expect(result.addresses[0].id).toBe('addr-A');
    expect(result.addresses[1].id).toBe('addr-B');
  });

  it('returns an empty addresses array when input has no addresses', async () => {
    const result = await checkoutService.getShippingInfo({ addresses: [] } as any);
    expect(result.addresses).toEqual([]);
  });

  it('returns cod=true for serviceable (IN) addresses at both levels', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ id: 'x', zipcode: '400001', country: 'IN' }],
    } as any);

    expect(result.addresses[0].cod).toBe(true);
    expect(result.addresses[0].cod_fee).toBeGreaterThanOrEqual(0);
    expect(result.addresses[0].shipping_methods[0].cod).toBe(true);
  });

  it('returns cod=false AND cod_fee=0 for non-serviceable addresses (Razorpay rule)', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ id: 'x', zipcode: '10001', country: 'US' }],
    } as any);

    expect(result.addresses[0].cod).toBe(false);
    expect(result.addresses[0].cod_fee).toBe(0);
    expect(result.addresses[0].shipping_methods[0].cod).toBe(false);
  });

  it('echoes back city/state/state_code when Razorpay sends them', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [
        {
          zipcode: '380009',
          country: 'in',
          city: 'Ahmedabad',
          state: 'Gujarat',
          state_code: 'GJ',
        },
      ],
    } as any);

    expect(result.addresses[0].city).toBe('Ahmedabad');
    expect(result.addresses[0].state).toBe('Gujarat');
    expect(result.addresses[0].state_code).toBe('GJ');
  });

  it('includes tax_details:null at top level (matches Razorpay response shape)', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ zipcode: '400001', country: 'in' }],
    } as any);

    expect((result as any).tax_details).toBeNull();
  });

  it('handles multiple IN addresses correctly', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [
        { id: '1', zipcode: '400001', country: 'IN' },
        { id: '2', zipcode: '110001', country: 'IN' },
      ],
    } as any);

    result.addresses.forEach((addr: any) => {
      expect(addr.shipping_methods[0].serviceable).toBe(true);
    });
  });

  // Regressions covering the schema-rejection bug that silently tripped
  // Razorpay's callback circuit breaker (cf. ticket #18726923).

  it('accepts pre-pincode callback (country-only, no zipcode) with a 200 placeholder', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ country: 'in' }],
    } as any);

    expect(result.addresses).toHaveLength(1);
    expect(result.addresses[0].serviceable).toBe(false);
    expect(result.addresses[0].cod).toBe(false);
    expect(result.addresses[0].cod_fee).toBe(0);
  });

  it('coerces numeric zipcode to string and still marks serviceable', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ zipcode: 400001, country: 'in' }],
    } as any);

    expect(result.addresses[0].zipcode).toBe('400001');
    expect(result.addresses[0].serviceable).toBe(true);
    expect(result.addresses[0].cod).toBe(true);
  });

  it('omits `id` when Razorpay does not send one (matches their default response shape)', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [
        { zipcode: '400001', country: 'IN' },
        { zipcode: '110001', country: 'IN' },
      ],
    } as any);

    expect((result.addresses[0] as any).id).toBeUndefined();
    expect((result.addresses[1] as any).id).toBeUndefined();
  });

  it('echoes `id` back only when Razorpay explicitly sends one', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ id: 'razorpay-addr-xyz', zipcode: '400001', country: 'IN' }],
    } as any);

    expect((result.addresses[0] as any).id).toBe('razorpay-addr-xyz');
  });

  it('accepts `pincode` alias in place of `zipcode`', async () => {
    const result = await checkoutService.getShippingInfo({
      addresses: [{ pincode: '400001', country: 'IN' }],
    } as any);

    expect(result.addresses[0].zipcode).toBe('400001');
    expect(result.addresses[0].serviceable).toBe(true);
  });

  it('is case-insensitive on country (accepts both `IN` and `in`)', async () => {
    const upper = await checkoutService.getShippingInfo({
      addresses: [{ zipcode: '400001', country: 'IN' }],
    } as any);
    const lower = await checkoutService.getShippingInfo({
      addresses: [{ zipcode: '400001', country: 'in' }],
    } as any);

    expect(upper.addresses[0].serviceable).toBe(true);
    expect(lower.addresses[0].serviceable).toBe(true);
  });
});

// ===========================================================================
// getPromotions
// ===========================================================================

describe('checkoutService.getPromotions', () => {
  it('returns active promotions mapped to code/description/summary', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([
      makeDiscount({ code: 'SAVE10', type: 'PERCENTAGE', value: 10 }),
      makeDiscount({ code: 'FLAT50', type: 'FLAT', value: 50 }),
    ]);

    const result = await checkoutService.getPromotions({} as any);

    expect(result.promotions).toHaveLength(2);
    expect(result.promotions[0].code).toBe('SAVE10');
    expect(result.promotions[0].description).toContain('10% off');
    expect(result.promotions[1].code).toBe('FLAT50');
    expect(result.promotions[1].description).toContain('₹50 off');
  });

  it('includes maxDiscountAmount in PERCENTAGE description when set', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([
      makeDiscount({ type: 'PERCENTAGE', value: 20, maxDiscountAmount: 200 }),
    ]);

    const result = await checkoutService.getPromotions({} as any);

    expect(result.promotions[0].description).toContain('up to ₹200');
  });

  it('omits cap text from PERCENTAGE description when maxDiscountAmount is null', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([
      makeDiscount({ type: 'PERCENTAGE', value: 15, maxDiscountAmount: null }),
    ]);

    const result = await checkoutService.getPromotions({} as any);

    expect(result.promotions[0].description).not.toContain('up to');
  });

  it("shows 'No minimum order' summary when minOrderValue is null", async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([makeDiscount({ minOrderValue: null })]);

    const result = await checkoutService.getPromotions({} as any);

    expect(result.promotions[0].summary).toBe('No minimum order');
  });

  it('shows minimum order value in summary when set', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([makeDiscount({ minOrderValue: 500 })]);

    const result = await checkoutService.getPromotions({} as any);

    expect(result.promotions[0].summary).toContain('500');
  });

  it('returns empty promotions array when no active codes exist', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([]);

    const result = await checkoutService.getPromotions({} as any);

    expect(result.promotions).toEqual([]);
  });

  it('queries DB with isActive=true and date-window constraints', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([]);

    await checkoutService.getPromotions({} as any);

    const call = mocks.discountCode.findMany.mock.calls[0][0];
    expect(call.where.isActive).toBe(true);
    expect(call.where.startsAt).toBeDefined();
    expect(call.where.expiresAt).toBeDefined();
  });

  it('limits results to 10 promotions', async () => {
    mocks.discountCode.findMany.mockResolvedValueOnce([]);

    await checkoutService.getPromotions({} as any);

    const call = mocks.discountCode.findMany.mock.calls[0][0];
    expect(call.take).toBe(10);
  });
});

// ===========================================================================
// applyPromotion
// ===========================================================================

describe('checkoutService.applyPromotion', () => {
  it('returns promotion_not_applicable when pending checkout is not found', async () => {
    // applyPromotion tries findUnique by razorpayOrderId first, then by orderNumber
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const result = await checkoutService.applyPromotion({
      order_id: 'ORD-MISSING',
      code: 'SAVE10',
    } as any);

    expect(result).toEqual({ promotion_not_applicable: true });
  });

  it('returns promotion object with value in paise when code is valid', async () => {
    const pending = makePendingCheckout({ subtotal: 1000 });
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
    mocks.discountCode.findUnique.mockResolvedValueOnce(makeDiscount({ type: 'FLAT', value: 100 }));

    const result = await checkoutService.applyPromotion({
      order_id: 'ORD-TEST-001',
      code: 'SAVE10',
    } as any);

    expect(result).toHaveProperty('promotion');
    const promo = (result as any).promotion;
    expect(promo.code).toBe('SAVE10');
    expect(promo.value).toBe('10000'); // 100 INR → 10000 paise (string per Razorpay API)
    expect(promo.value_type).toBe('fixed_amount');
  });

  it('returns promotion with reference_id equal to the code', async () => {
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(makePendingCheckout({ subtotal: 500 }));
    mocks.discountCode.findUnique.mockResolvedValueOnce(makeDiscount({ type: 'FLAT', value: 50 }));

    const result = await checkoutService.applyPromotion({
      order_id: 'ORD-TEST-001',
      code: 'FLAT50',
    } as any);

    expect((result as any).promotion.reference_id).toBe('FLAT50');
    expect((result as any).promotion.type).toBe('coupon');
  });

  it('returns promotion_not_applicable when discount code does not exist', async () => {
    const pending = makePendingCheckout({ subtotal: 1000 });
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
    mocks.discountCode.findUnique.mockResolvedValueOnce(null);

    const result = await checkoutService.applyPromotion({
      order_id: 'ORD-TEST-001',
      code: 'INVALID',
    } as any);

    expect(result).toEqual({ promotion_not_applicable: true });
  });

  it('returns promotion_not_applicable for unexpected non-ApiError exceptions', async () => {
    const pending = makePendingCheckout({ subtotal: 1000 });
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
    mocks.discountCode.findUnique.mockRejectedValueOnce(new Error('DB crash'));

    const result = await checkoutService.applyPromotion({
      order_id: 'ORD-TEST-001',
      code: 'SAVE10',
    } as any);

    expect(result).toEqual({ promotion_not_applicable: true });
  });

  it('returns promotion_not_applicable (not a thrown exception) when calculateDiscount throws a generic error', async () => {
    // pendingCheckout is found, but the discountCode DB call throws a generic error
    const pending = makePendingCheckout({ subtotal: 500 });
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
    mocks.discountCode.findUnique.mockRejectedValueOnce(new TypeError('Network error'));

    const result = await checkoutService.applyPromotion({
      order_id: 'ORD-TEST-001',
      code: 'SAVE10',
    } as any);

    // applyPromotion catches errors and returns promotion_not_applicable
    expect(result).toEqual({ promotion_not_applicable: true });
  });
});

// ===========================================================================
// verifyMagicPayment
// ===========================================================================

describe('checkoutService.verifyMagicPayment', () => {
  // Build a valid HMAC signature for testing happy paths
  function makeValidSignature(orderId: string, paymentId: string) {
    const body = orderId + '|' + paymentId;
    return crypto.createHmac('sha256', 'test_secret').update(body).digest('hex');
  }

  function makeValidVerifyInput(overrides: Record<string, unknown> = {}) {
    const orderId = 'rzp_order_abc123';
    const paymentId = 'pay_test_001';
    return {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: makeValidSignature(orderId, paymentId),
      ...overrides,
    };
  }

  function makeRzpOrderFetch(addressOverrides: Record<string, unknown> = {}) {
    return {
      customer_details: {
        contact: '+919876543210',
        email: 'customer@example.com',
        shipping_address: {
          name: 'Test Customer',
          line1: '123 Test St',
          line2: '',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipcode: '400001',
          country: 'IN',
          tag: 'Home',
          ...addressOverrides,
        },
      },
    };
  }

  // ── HMAC signature verification ──────────────────────────────────────────

  describe('signature verification', () => {
    it('throws 400 BAD_REQUEST when the signature is invalid', async () => {
      const input = makeValidVerifyInput({ razorpaySignature: 'invalid_sig' });

      await expect(
        checkoutService.verifyMagicPayment('user-1', input as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Payment verification failed',
      });
    });

    it('throws 400 when signature is all zeros (tampered)', async () => {
      const input = makeValidVerifyInput({
        razorpaySignature: '0'.repeat(64),
      });

      await expect(
        checkoutService.verifyMagicPayment('user-1', input as any)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('proceeds past signature check when HMAC is correct', async () => {
      const input = makeValidVerifyInput();
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(null);

      // Will throw 404 (not found), NOT 400 (bad signature)
      await expect(
        checkoutService.verifyMagicPayment('user-1', input as any)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── Pending checkout lookup ───────────────────────────────────────────────

  describe('pending checkout lookup', () => {
    it('throws 404 when pending checkout is not found', async () => {
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(null);

      await expect(
        checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Checkout session not found',
      });
    });

    it('throws 403 when authenticated userId mismatches the pending checkout userId', async () => {
      const pending = makePendingCheckout({ userId: 'user-OTHER' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);

      await expect(
        checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Checkout session does not belong to this user',
      });
    });

    it("allows access when userId matches the pending checkout's userId", async () => {
      const pending = makePendingCheckout({ userId: 'user-1' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(1);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await expect(
        checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any)
      ).resolves.toBeDefined();
    });

    it('allows guest access when both userId and pending.userId are null', async () => {
      const pending = makePendingCheckout({ userId: null, guestEmail: 'g@x.com' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      // Auto-create user flow: findUnique returns null (no existing user by email)
      mocks.user.findUnique.mockResolvedValueOnce(null);
      // findFirst returns null (no existing user by phone)
      mocks.user.findFirst.mockResolvedValueOnce(null);
      // Auto-create user
      mocks.user.create.mockResolvedValueOnce({ id: 'auto-user-1', email: 'customer@example.com' });
      mocks.address.create.mockResolvedValueOnce(makeAddress({ id: 'addr-new' }));
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(1);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await expect(
        checkoutService.verifyMagicPayment(null, makeValidVerifyInput() as any)
      ).resolves.toBeDefined();
    });
  });

  // ── Address handling ──────────────────────────────────────────────────────

  describe('shipping address handling', () => {
    it('reuses existing address for authenticated user when pinCode+line1 match', async () => {
      const pending = makePendingCheckout({ userId: 'user-1' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      const existingAddr = makeAddress({ id: 'addr-existing' });
      mocks.address.findFirst.mockResolvedValueOnce(existingAddr);
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(0);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      expect(mocks.address.create).not.toHaveBeenCalled();
      // Address ID from existing address is used in order create
      expect(mocks.txOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ addressId: 'addr-existing' }),
        })
      );
    });

    it('creates new address for authenticated user when no existing match', async () => {
      const pending = makePendingCheckout({ userId: 'user-1' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(null); // no existing match
      mocks.address.count.mockResolvedValueOnce(2);
      mocks.address.create.mockResolvedValueOnce(makeAddress({ id: 'addr-new', isDefault: false }));
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(0);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      expect(mocks.address.create).toHaveBeenCalledOnce();
      expect(mocks.address.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', isDefault: false }),
        })
      );
    });

    it('sets isDefault=true when creating the first address for a user', async () => {
      const pending = makePendingCheckout({ userId: 'user-1' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(null);
      mocks.address.count.mockResolvedValueOnce(0); // first address
      mocks.address.create.mockResolvedValueOnce(makeAddress({ id: 'addr-1', isDefault: true }));
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(0);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      expect(mocks.address.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
        })
      );
    });

    it('creates unlinked address for guest users (no userId)', async () => {
      const pending = makePendingCheckout({ userId: null, guestEmail: 'g@x.com' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      // Auto-create user flow
      mocks.user.findUnique.mockResolvedValueOnce(null);
      mocks.user.findFirst.mockResolvedValueOnce(null);
      mocks.user.create.mockResolvedValueOnce({ id: 'auto-user-1', email: 'customer@example.com' });
      // After auto-creation, the user is no longer a "guest" — address is linked to auto-created user
      mocks.address.findFirst.mockResolvedValueOnce(null);
      mocks.address.count.mockResolvedValueOnce(0);
      mocks.address.create.mockResolvedValueOnce(makeAddress({ id: 'addr-guest' }));
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(1);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment(null, makeValidVerifyInput() as any);

      expect(mocks.address.create).toHaveBeenCalledOnce();
    });

    it('throws 400 when no address from Razorpay and no default address for authenticated user', async () => {
      const pending = makePendingCheckout({ userId: 'user-1' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce({
        customer_details: {}, // no shipping_address
      });
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(null); // no default address

      await expect(
        checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'No shipping address found',
      });
    });

    it('throws 400 for guest checkout when no address from Razorpay', async () => {
      const pending = makePendingCheckout({ userId: null, guestEmail: 'g@x.com' });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce({
        customer_details: {}, // no shipping_address, no email
      });
      // Auto-create user flow — no customer email means isGuest stays true
      // (customerEmail would be '' since no customer_details.email and pending.guestEmail is 'g@x.com')
      // Actually guestEmail exists so auto-create fires
      mocks.user.findUnique.mockResolvedValueOnce(null);
      mocks.user.findFirst.mockResolvedValueOnce(null);
      mocks.user.create.mockResolvedValueOnce({ id: 'auto-user-1', email: 'g@x.com' });
      // After auto-creation, user is no longer guest → tries to find default address
      mocks.address.findFirst.mockResolvedValueOnce(null);

      await expect(
        checkoutService.verifyMagicPayment(null, makeValidVerifyInput() as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'No shipping address found',
      });
    });
  });

  // ── Total amount — never negative ────────────────────────────────────────

  describe('total amount — never negative in verifyMagicPayment', () => {
    it('clamps total to 0 when discounts exceed subtotal in pending checkout', async () => {
      // discount=600, loyaltyDiscount=600 but subtotal=500 → total would be negative
      const pending = makePendingCheckout({
        userId: 'user-1',
        subtotal: 500,
        discountAmount: 400,
        loyaltyDiscount: 200, // 500 - 400 - 200 = -100 → clamped to 0
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant({ price: 250 })]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderCount.mockResolvedValueOnce(0);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      expect(mocks.txOrderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmount: 0 }),
        })
      );
    });
  });

  // ── Return value ──────────────────────────────────────────────────────────

  describe('return value', () => {
    it('returns orderNumber and pointsEarned (1 per 100 INR) for authenticated user', async () => {
      const pending = makePendingCheckout({
        userId: 'user-1',
        subtotal: 1000,
        discountAmount: 0,
        loyaltyDiscount: 0,
        loyaltyPointsToUse: 0,
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant({ price: 500 })]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderUpdate.mockResolvedValueOnce({});
      mocks.txUserUpdate.mockResolvedValue({});
      mocks.txLoyaltyTransactionCreate.mockResolvedValue({});
      mocks.txOrderCount.mockResolvedValueOnce(2); // not first purchase
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      const result = await checkoutService.verifyMagicPayment(
        'user-1',
        makeValidVerifyInput() as any
      );

      expect(result).toHaveProperty('orderNumber', 'ORD-TEST-001');
      expect(result).toHaveProperty('pointsEarned');
      // 1000 INR / 100 = 10 points
      expect(result.pointsEarned).toBe(10);
    });

    it('returns pointsEarned for auto-created guest users', async () => {
      const pending = makePendingCheckout({
        userId: null,
        guestEmail: 'g@x.com',
        subtotal: 1000,
        discountAmount: 0,
        loyaltyDiscount: 0,
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      // Auto-create user flow
      mocks.user.findUnique.mockResolvedValueOnce(null);
      mocks.user.findFirst.mockResolvedValueOnce(null);
      mocks.user.create.mockResolvedValueOnce({ id: 'auto-user-1', email: 'customer@example.com' });
      mocks.address.findFirst.mockResolvedValueOnce(null);
      mocks.address.count.mockResolvedValueOnce(0);
      mocks.address.create.mockResolvedValueOnce(makeAddress({ id: 'addr-g' }));
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant({ price: 500 })]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderUpdate.mockResolvedValueOnce({});
      mocks.txUserUpdate.mockResolvedValue({});
      mocks.txLoyaltyTransactionCreate.mockResolvedValue({});
      mocks.txOrderCount.mockResolvedValueOnce(1);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      const result = await checkoutService.verifyMagicPayment(null, makeValidVerifyInput() as any);

      // Auto-created users earn points (1000 INR / 100 = 10 points)
      expect(result.pointsEarned).toBe(10);
    });
  });

  // ── Loyalty points deduction in transaction ───────────────────────────────

  describe('loyalty points deduction in transaction', () => {
    it('decrements user loyalty points when loyaltyPointsToUse > 0', async () => {
      const pending = makePendingCheckout({
        userId: 'user-1',
        subtotal: 1000,
        discountAmount: 0,
        loyaltyDiscount: 200,
        loyaltyPointsToUse: 200,
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant({ price: 500 })]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderUpdate.mockResolvedValueOnce({});
      mocks.txUserUpdate.mockResolvedValue({});
      mocks.txLoyaltyTransactionCreate.mockResolvedValue({});
      mocks.txOrderCount.mockResolvedValueOnce(2);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      expect(mocks.txUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { loyaltyPoints: { decrement: 200 } },
        })
      );
    });

    it('skips loyalty deduction when loyaltyPointsToUse is 0', async () => {
      const pending = makePendingCheckout({
        userId: 'user-1',
        subtotal: 1000,
        discountAmount: 0,
        loyaltyDiscount: 0,
        loyaltyPointsToUse: 0,
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant({ price: 500 })]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txOrderUpdate.mockResolvedValueOnce({});
      mocks.txUserUpdate.mockResolvedValue({});
      mocks.txLoyaltyTransactionCreate.mockResolvedValue({});
      mocks.txOrderCount.mockResolvedValueOnce(2);
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      // decrement should NOT be called for deducting loyalty (increment for earning may be called)
      const decrementCalls = mocks.txUserUpdate.mock.calls.filter(
        (c: any[]) => c[0]?.data?.loyaltyPoints?.decrement !== undefined
      );
      expect(decrementCalls).toHaveLength(0);
    });
  });

  // ── Stock deduction fallback (legacy stockReserved=false) ────────────────

  describe('legacy stock deduction (stockReserved=false)', () => {
    it('deducts stock inside transaction when stockReserved=false', async () => {
      const pending = makePendingCheckout({
        userId: 'user-1',
        stockReserved: false,
        itemsJson: JSON.stringify([{ variantId: 'variant-1', quantity: 2 }]),
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      setupVerifyTransaction();
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });
      mocks.txVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
      mocks.txOrderCount.mockResolvedValueOnce(0);
      mocks.txReferralFindUnique.mockResolvedValueOnce(null);
      mocks.txUserUpdate.mockResolvedValue({});
      mocks.txLoyaltyTransactionCreate.mockResolvedValue({});
      mocks.txOrderUpdate.mockResolvedValueOnce({});
      mocks.txCartFindUnique.mockResolvedValueOnce(null);
      mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

      await checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any);

      expect(mocks.txVariantUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'variant-1', stock: { gte: 2 } }),
          data: { stock: { decrement: 2 } },
        })
      );
    });

    it('throws 400 when legacy stock deduction fails (insufficient stock)', async () => {
      const pending = makePendingCheckout({
        userId: 'user-1',
        stockReserved: false,
      });
      mocks.pendingCheckout.findUnique.mockResolvedValueOnce(pending);
      mocks.razorpayOrdersFetch.mockResolvedValueOnce(makeRzpOrderFetch());
      mocks.user.findUnique.mockResolvedValueOnce({ phone: null, email: 'u@x.com' });
      mocks.address.findFirst.mockResolvedValueOnce(makeAddress());
      mocks.productVariant.findMany.mockResolvedValueOnce([makeVariant()]);
      mocks.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => {
        const txWithFailingStock = {
          ...mocks.txClient,
          productVariant: {
            ...mocks.txClient.productVariant,
            updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
          },
        };
        return fn(txWithFailingStock);
      });
      mocks.txOrderCreate.mockResolvedValueOnce({ id: 'order-1' });

      await expect(
        checkoutService.verifyMagicPayment('user-1', makeValidVerifyInput() as any)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Insufficient stock'),
      });
    });
  });
});

// ===========================================================================
// restoreExpiredReservations
// ===========================================================================

describe('restoreExpiredReservations', () => {
  it('returns 0 when there are no expired pending checkouts', async () => {
    mocks.pendingCheckout.findMany.mockResolvedValueOnce([]);

    const count = await restoreExpiredReservations();

    expect(count).toBe(0);
    expect(mocks.$transaction).not.toHaveBeenCalled();
  });

  it('restores stock and deletes checkout for a single expired reservation', async () => {
    const expiredCheckout = makePendingCheckout({
      id: 'pc-expired-1',
      itemsJson: JSON.stringify([
        { variantId: 'variant-1', quantity: 3 },
        { variantId: 'variant-2', quantity: 1 },
      ]),
    });
    mocks.pendingCheckout.findMany.mockResolvedValueOnce([expiredCheckout]);

    mocks.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => {
      const txClient = {
        productVariant: { update: mocks.txVariantUpdate },
        pendingCheckout: { delete: mocks.txPendingCheckoutDelete },
      };
      return fn(txClient);
    });
    mocks.txVariantUpdate.mockResolvedValue({});
    mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

    const count = await restoreExpiredReservations();

    expect(count).toBe(1);
    // Variant-1: restore 3 units
    expect(mocks.txVariantUpdate).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: { stock: { increment: 3 } },
    });
    // Variant-2: restore 1 unit
    expect(mocks.txVariantUpdate).toHaveBeenCalledWith({
      where: { id: 'variant-2' },
      data: { stock: { increment: 1 } },
    });
    expect(mocks.txPendingCheckoutDelete).toHaveBeenCalledWith({ where: { id: 'pc-expired-1' } });
  });

  it('processes multiple expired checkouts and returns the correct count', async () => {
    const checkouts = [
      makePendingCheckout({
        id: 'pc-1',
        itemsJson: JSON.stringify([{ variantId: 'vA', quantity: 2 }]),
      }),
      makePendingCheckout({
        id: 'pc-2',
        itemsJson: JSON.stringify([{ variantId: 'vB', quantity: 5 }]),
      }),
    ];
    mocks.pendingCheckout.findMany.mockResolvedValueOnce(checkouts);

    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txClient = {
        productVariant: { update: mocks.txVariantUpdate },
        pendingCheckout: { delete: mocks.txPendingCheckoutDelete },
      };
      return fn(txClient);
    });
    mocks.txVariantUpdate.mockResolvedValue({});
    mocks.txPendingCheckoutDelete.mockResolvedValue({});

    const count = await restoreExpiredReservations();

    expect(count).toBe(2);
    expect(mocks.$transaction).toHaveBeenCalledTimes(2);
  });

  it('runs each expired checkout restore in its own isolated transaction', async () => {
    const checkouts = [
      makePendingCheckout({
        id: 'pc-A',
        itemsJson: JSON.stringify([{ variantId: 'v1', quantity: 1 }]),
      }),
      makePendingCheckout({
        id: 'pc-B',
        itemsJson: JSON.stringify([{ variantId: 'v2', quantity: 1 }]),
      }),
      makePendingCheckout({
        id: 'pc-C',
        itemsJson: JSON.stringify([{ variantId: 'v3', quantity: 1 }]),
      }),
    ];
    mocks.pendingCheckout.findMany.mockResolvedValueOnce(checkouts);

    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txClient = {
        productVariant: { update: mocks.txVariantUpdate },
        pendingCheckout: { delete: mocks.txPendingCheckoutDelete },
      };
      return fn(txClient);
    });
    mocks.txVariantUpdate.mockResolvedValue({});
    mocks.txPendingCheckoutDelete.mockResolvedValue({});

    await restoreExpiredReservations();

    // One transaction per checkout
    expect(mocks.$transaction).toHaveBeenCalledTimes(3);
  });

  it('queries only checkouts older than CHECKOUT_EXPIRY_MS with stockReserved=true', async () => {
    mocks.pendingCheckout.findMany.mockResolvedValueOnce([]);

    await restoreExpiredReservations();

    const call = mocks.pendingCheckout.findMany.mock.calls[0][0];
    expect(call.where.stockReserved).toBe(true);
    expect(call.where.createdAt).toBeDefined();
    expect(call.where.createdAt.lt).toBeInstanceOf(Date);
  });

  it('the expiry date is approximately 2 hours in the past', async () => {
    mocks.pendingCheckout.findMany.mockResolvedValueOnce([]);

    const beforeCall = Date.now();
    await restoreExpiredReservations();
    const afterCall = Date.now();

    const call = mocks.pendingCheckout.findMany.mock.calls[0][0];
    const ltDate = call.where.createdAt.lt as Date;
    const diffMs = beforeCall - ltDate.getTime();

    // Should be approximately 7_200_000ms (2h) with a small tolerance
    expect(diffMs).toBeGreaterThanOrEqual(7_200_000 - 100);
    expect(diffMs).toBeLessThanOrEqual(7_200_000 + afterCall - beforeCall + 100);
  });

  it('restores correct quantity per variant item', async () => {
    const expiredCheckout = makePendingCheckout({
      id: 'pc-qty-test',
      itemsJson: JSON.stringify([{ variantId: 'special-variant', quantity: 7 }]),
    });
    mocks.pendingCheckout.findMany.mockResolvedValueOnce([expiredCheckout]);

    mocks.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => {
      const txClient = {
        productVariant: { update: mocks.txVariantUpdate },
        pendingCheckout: { delete: mocks.txPendingCheckoutDelete },
      };
      return fn(txClient);
    });
    mocks.txVariantUpdate.mockResolvedValueOnce({});
    mocks.txPendingCheckoutDelete.mockResolvedValueOnce({});

    await restoreExpiredReservations();

    expect(mocks.txVariantUpdate).toHaveBeenCalledWith({
      where: { id: 'special-variant' },
      data: { stock: { increment: 7 } },
    });
  });

  it('returns 0 and skips transactions when no checkouts have stockReserved=true (empty result)', async () => {
    mocks.pendingCheckout.findMany.mockResolvedValueOnce([]);

    const result = await restoreExpiredReservations();

    expect(result).toBe(0);
    expect(mocks.txVariantUpdate).not.toHaveBeenCalled();
    expect(mocks.txPendingCheckoutDelete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// ApiError shape — cross-cutting
// ===========================================================================

describe('ApiError shapes produced by checkoutService', () => {
  it('variant-not-available error is ApiError with statusCode 400 and code BAD_REQUEST', async () => {
    // Guest checkout no longer requires email — test a different error path
    mocks.productVariant.findMany.mockResolvedValueOnce([]); // no variants found

    const err = await checkoutService
      .createMagicOrder(null, makeCheckoutInput() as any)
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('variant-not-found error is ApiError with statusCode 400', async () => {
    mocks.productVariant.findMany.mockResolvedValueOnce([]); // empty results

    const err = await checkoutService
      .createMagicOrder('user-1', makeCheckoutInput() as any)
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
  });

  it('price-changed error is ApiError with statusCode 409 and code CONFLICT', async () => {
    const variant = makeVariant({ price: 500 });
    mocks.productVariant.findMany.mockResolvedValueOnce([variant]);
    mocks.razorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
    const updatedVariant = makeVariant({
      price: 750,
      product: { ...makeVariant().product, price: 750 },
    });
    mocks.txVariantFindUnique.mockResolvedValueOnce(updatedVariant);
    mocks.$transaction.mockImplementationOnce((fn: (tx: unknown) => unknown, _opts?: unknown) =>
      fn(mocks.txClient)
    );

    const err = await checkoutService
      .createMagicOrder('user-1', makeCheckoutInput() as any)
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('pending-checkout-not-found error is ApiError with statusCode 404 and code NOT_FOUND', async () => {
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(null);

    const err = await checkoutService
      .verifyMagicPayment('user-1', makeVerifyInput() as any)
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('session-ownership error is ApiError with statusCode 403 and code FORBIDDEN', async () => {
    mocks.pendingCheckout.findUnique.mockResolvedValueOnce(
      makePendingCheckout({ userId: 'user-OTHER' })
    );

    const err = await checkoutService
      .verifyMagicPayment('user-1', makeVerifyInput() as any)
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});
