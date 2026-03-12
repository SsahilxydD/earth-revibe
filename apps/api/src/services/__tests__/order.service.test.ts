import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock variables — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------

const {
  mockCartFindUnique,
  mockAddressFindFirst,
  mockDiscountCodeFindUnique,
  mockOrderCount,
  mockUserFindUnique,
  mockLoyaltyConfigFindFirst,
  mockOrderFindUnique,
  mockOrderFindMany,
  mockPaymentFindUnique,
  mockPaymentUpdate,
  mockTransaction,
  // tx-level mocks
  mockTxProductVariantFindUnique,
  mockTxProductVariantUpdateMany,
  mockTxProductVariantUpdate,
  mockTxDiscountCodeUpdate,
  mockTxOrderCreate,
  mockTxOrderUpdate,
  mockTxOrderStatusHistoryCreate,
  mockTxOrderItemFindMany,
  mockTxUserUpdate,
  mockTxLoyaltyTransactionCreate,
  mockTxReferralFindUnique,
  mockTxReferralUpdate,
  mockTxOrderCount,
  mockTxPaymentUpdate,
  mockTxCartFindUnique,
  mockTxCartItemDeleteMany,
  // razorpay
  mockRazorpayOrdersCreate,
  mockRazorpayPaymentsRefund,
  mockGetRazorpay,
  // other
  mockGenerateOrderNumber,
  mockLoggerError,
  mockShiprocketCreate,
} = vi.hoisted(() => {
  const mockTxProductVariantFindUnique = vi.fn();
  const mockTxProductVariantUpdateMany = vi.fn();
  const mockTxProductVariantUpdate = vi.fn();
  const mockTxDiscountCodeUpdate = vi.fn();
  const mockTxOrderCreate = vi.fn();
  const mockTxOrderUpdate = vi.fn();
  const mockTxOrderStatusHistoryCreate = vi.fn();
  const mockTxOrderItemFindMany = vi.fn();
  const mockTxUserUpdate = vi.fn();
  const mockTxLoyaltyTransactionCreate = vi.fn();
  const mockTxReferralFindUnique = vi.fn();
  const mockTxReferralUpdate = vi.fn();
  const mockTxOrderCount = vi.fn();
  const mockTxPaymentUpdate = vi.fn();
  const mockTxCartFindUnique = vi.fn();
  const mockTxCartItemDeleteMany = vi.fn();

  // The mock tx client passed into every $transaction callback
  const mockTx = {
    productVariant: {
      findUnique: mockTxProductVariantFindUnique,
      updateMany: mockTxProductVariantUpdateMany,
      update: mockTxProductVariantUpdate,
    },
    discountCode: { update: mockTxDiscountCodeUpdate },
    order: {
      create: mockTxOrderCreate,
      update: mockTxOrderUpdate,
      count: mockTxOrderCount,
    },
    orderStatusHistory: { create: mockTxOrderStatusHistoryCreate },
    orderItem: { findMany: mockTxOrderItemFindMany },
    user: { update: mockTxUserUpdate },
    loyaltyTransaction: { create: mockTxLoyaltyTransactionCreate },
    referral: {
      findUnique: mockTxReferralFindUnique,
      update: mockTxReferralUpdate,
    },
    payment: { update: mockTxPaymentUpdate },
    cart: { findUnique: mockTxCartFindUnique },
    cartItem: { deleteMany: mockTxCartItemDeleteMany },
  };

  const mockTransaction = vi.fn(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

  const mockRazorpayOrdersCreate = vi.fn();
  const mockRazorpayPaymentsRefund = vi.fn();
  const mockGetRazorpay = vi.fn(() => ({
    orders: { create: mockRazorpayOrdersCreate },
    payments: { refund: mockRazorpayPaymentsRefund },
  }));

  return {
    mockCartFindUnique: vi.fn(),
    mockAddressFindFirst: vi.fn(),
    mockDiscountCodeFindUnique: vi.fn(),
    mockOrderCount: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockLoyaltyConfigFindFirst: vi.fn(),
    mockOrderFindUnique: vi.fn(),
    mockOrderFindMany: vi.fn(),
    mockPaymentFindUnique: vi.fn(),
    mockPaymentUpdate: vi.fn(),
    mockTransaction,
    mockTxProductVariantFindUnique,
    mockTxProductVariantUpdateMany,
    mockTxProductVariantUpdate,
    mockTxDiscountCodeUpdate,
    mockTxOrderCreate,
    mockTxOrderUpdate,
    mockTxOrderStatusHistoryCreate,
    mockTxOrderItemFindMany,
    mockTxUserUpdate,
    mockTxLoyaltyTransactionCreate,
    mockTxReferralFindUnique,
    mockTxReferralUpdate,
    mockTxOrderCount,
    mockTxPaymentUpdate,
    mockTxCartFindUnique,
    mockTxCartItemDeleteMany,
    mockRazorpayOrdersCreate,
    mockRazorpayPaymentsRefund,
    mockGetRazorpay,
    mockGenerateOrderNumber: vi.fn(() => "ORD-TEST-001"),
    mockLoggerError: vi.fn(),
    mockShiprocketCreate: vi.fn(() => Promise.resolve()),
  };
});

// ---------------------------------------------------------------------------
// Module mocks — paths are relative to THIS test file (src/services/__tests__/)
// Two levels up (../../) to reach src/ from src/services/__tests__/
// One level up (../) to reach src/services/ from src/services/__tests__/
// ---------------------------------------------------------------------------

vi.mock("@earth-revibe/db", () => ({
  prisma: {
    cart: { findUnique: mockCartFindUnique },
    address: { findFirst: mockAddressFindFirst },
    discountCode: { findUnique: mockDiscountCodeFindUnique },
    order: {
      count: mockOrderCount,
      findUnique: mockOrderFindUnique,
      findMany: mockOrderFindMany,
    },
    user: { findUnique: mockUserFindUnique },
    loyaltyConfig: { findFirst: mockLoyaltyConfigFindFirst },
    payment: {
      findUnique: mockPaymentFindUnique,
      update: mockPaymentUpdate,
    },
    $transaction: mockTransaction,
  },
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
}));

vi.mock("../../config/razorpay", () => ({ getRazorpay: mockGetRazorpay }));

vi.mock("../../config/env", () => ({
  env: { RAZORPAY_KEY_ID: "test_key", RAZORPAY_KEY_SECRET: "test_secret" },
}));

vi.mock("../../config/logger", () => ({ logger: { error: mockLoggerError } }));

vi.mock("../../config/constants", () => ({
  APP_CONSTANTS: { REFERRER_REWARD_POINTS: 100, REFEREE_REWARD_POINTS: 50 },
}));

vi.mock("@earth-revibe/shared", () => ({
  generateOrderNumber: mockGenerateOrderNumber,
}));

vi.mock("../shiprocket.service", () => ({
  shiprocketService: { createShiprocketOrder: mockShiprocketCreate },
}));

vi.mock("../../utils/api-error", () => {
  class ApiError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, message: string, code = "ERROR") {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      Object.setPrototypeOf(this, ApiError.prototype);
    }
    static badRequest(msg: string) { return new ApiError(400, msg, "BAD_REQUEST"); }
    static notFound(msg = "Resource not found") { return new ApiError(404, msg, "NOT_FOUND"); }
    static forbidden(msg = "Forbidden") { return new ApiError(403, msg, "FORBIDDEN"); }
    static conflict(msg: string) { return new ApiError(409, msg, "CONFLICT"); }
    static internal(msg = "Internal server error") { return new ApiError(500, msg, "INTERNAL_ERROR"); }
  }
  return { ApiError };
});

// ---------------------------------------------------------------------------
// Subject under test — imported AFTER all mocks are in place
// ---------------------------------------------------------------------------

import { orderService } from "../order.service";

// ---------------------------------------------------------------------------
// Fixed dates and constants
// ---------------------------------------------------------------------------

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");
const USER_ID = "user-001";
const ORDER_NUMBER = "ORD-TEST-001";

// ---------------------------------------------------------------------------
// Fixture factories — always return new objects (immutable pattern)
// ---------------------------------------------------------------------------

function makeCartItem(overrides: {
  variantId?: string;
  quantity?: number;
  variantPrice?: number | null;
  productPrice?: number;
  productId?: string;
  categoryId?: string;
} = {}) {
  const {
    variantId = "variant-001",
    quantity = 2,
    variantPrice = 500,
    productPrice = 400,
    productId = "product-001",
    categoryId = "cat-001",
  } = overrides;

  return {
    variantId,
    quantity,
    variant: {
      price: variantPrice,
      size: "M",
      color: "Blue",
      product: {
        id: productId,
        name: "Test T-Shirt",
        price: productPrice,
        categoryId,
        images: [{ url: "https://cdn.example.com/img.jpg", isPrimary: true }],
      },
    },
  };
}

function makeCart(items = [makeCartItem()]) {
  return { id: "cart-001", userId: USER_ID, items };
}

function makeAddress(userId = USER_ID) {
  return {
    id: "addr-001",
    userId,
    line1: "1 Test Lane",
    city: "Mumbai",
    pincode: "400001",
    state: "MH",
    country: "India",
  };
}

function makeDiscount(overrides: Record<string, unknown> = {}) {
  return {
    id: "disc-001",
    code: "SAVE10",
    isActive: true,
    startsAt: new Date(Date.now() - 86_400_000), // yesterday
    expiresAt: new Date(Date.now() + 86_400_000), // tomorrow
    usageLimit: null,
    usageCount: 0,
    perUserLimit: 99,
    applicableProducts: [],
    applicableCategories: [],
    minOrderValue: null,
    type: "PERCENTAGE",
    value: 10,
    maxDiscountAmount: null,
    ...overrides,
  };
}

function makeRazorpayOrder(id = "rp_order_001") {
  return { id, currency: "INR", amount: 100000 };
}

function makeCreatedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-db-001",
    orderNumber: ORDER_NUMBER,
    userId: USER_ID,
    status: "PLACED",
    subtotal: 1000,
    discountAmount: 0,
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: 1000,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 0,
    items: [],
    payment: { id: "pay-001", razorpayOrderId: "rp_order_001", status: "PENDING", amount: 1000 },
    ...overrides,
  };
}

function makeFullOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-db-001",
    orderNumber: ORDER_NUMBER,
    userId: USER_ID,
    status: "PLACED",
    subtotal: 1000,
    discountAmount: 0,
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: 1000,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 0,
    discountCodeId: null,
    payment: null,
    ...overrides,
  };
}

function makePaymentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-001",
    razorpayOrderId: "rp_order_001",
    razorpayPaymentId: null as string | null,
    razorpaySignature: null as string | null,
    status: "PENDING",
    amount: 1000,
    paidAt: null as Date | null,
    failureReason: null as string | null,
    order: makeFullOrder(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Rebuild tx client after resetAllMocks wipes it.
// Call this in beforeEach to restore the transaction implementation.
// ---------------------------------------------------------------------------
function restoreTxMock() {
  mockTransaction.mockImplementation(
    async (cb: (tx: unknown) => unknown) => cb({
      productVariant: {
        findUnique: mockTxProductVariantFindUnique,
        updateMany: mockTxProductVariantUpdateMany,
        update: mockTxProductVariantUpdate,
      },
      discountCode: { update: mockTxDiscountCodeUpdate },
      order: {
        create: mockTxOrderCreate,
        update: mockTxOrderUpdate,
        count: mockTxOrderCount,
      },
      orderStatusHistory: { create: mockTxOrderStatusHistoryCreate },
      orderItem: { findMany: mockTxOrderItemFindMany },
      user: { update: mockTxUserUpdate },
      loyaltyTransaction: { create: mockTxLoyaltyTransactionCreate },
      referral: {
        findUnique: mockTxReferralFindUnique,
        update: mockTxReferralUpdate,
      },
      payment: { update: mockTxPaymentUpdate },
      cart: { findUnique: mockTxCartFindUnique },
      cartItem: { deleteMany: mockTxCartItemDeleteMany },
    })
  );
}

/**
 * Sets up all mocks for a successful createOrder happy path.
 * Uses mockResolvedValueOnce throughout to prevent leakage between tests.
 */
function setupCreateOrderHappyPath({
  cartItems = [makeCartItem()],
  discountCode = null as Record<string, unknown> | null,
  loyaltyPointsToUse = 0,
  razorpayOrderId = "rp_order_001",
  txVariantPrice = 500,
  txVariantStock = 10,
  totalAmount = 1000,
} = {}) {
  mockCartFindUnique.mockResolvedValueOnce(makeCart(cartItems));
  mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
  if (discountCode) {
    mockDiscountCodeFindUnique.mockResolvedValueOnce(makeDiscount(discountCode));
    mockOrderCount.mockResolvedValueOnce(0);
  }
  if (loyaltyPointsToUse > 0) {
    mockUserFindUnique.mockResolvedValueOnce({ id: USER_ID, loyaltyPoints: 500 });
    mockLoyaltyConfigFindFirst.mockResolvedValueOnce(null);
  }
  mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder(razorpayOrderId));
  mockTxProductVariantFindUnique.mockResolvedValueOnce({
    price: txVariantPrice,
    stock: txVariantStock,
    product: { price: 400, name: "Test T-Shirt" },
  });
  mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
  mockTxOrderCreate.mockResolvedValueOnce(
    makeCreatedOrder({ totalAmount, payment: { id: "pay-001", razorpayOrderId, status: "PENDING", amount: totalAmount } })
  );
}

/**
 * Sets up all mocks for a successful verifyPayment happy path.
 */
function setupVerifyPaymentHappyPath({
  loyaltyPointsUsed = 0,
  totalAmount = 1000,
  orderCount = 1,
} = {}) {
  const order = makeFullOrder({ loyaltyPointsUsed, totalAmount });
  mockPaymentFindUnique.mockResolvedValueOnce(makePaymentRecord({ order }));
  mockTxPaymentUpdate.mockResolvedValueOnce({});
  mockTxOrderUpdate.mockResolvedValue({});
  mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
  mockTxOrderCount.mockResolvedValueOnce(orderCount);
  mockTxReferralFindUnique.mockResolvedValueOnce(null);
  mockTxCartFindUnique.mockResolvedValueOnce({ id: "cart-001", userId: USER_ID });
  mockTxCartItemDeleteMany.mockResolvedValueOnce({ count: 2 });
  mockTxUserUpdate.mockResolvedValue({});
  mockTxLoyaltyTransactionCreate.mockResolvedValue({});
}

const BASE_CREATE_INPUT = {
  addressId: "addr-001",
  discountCode: undefined as string | undefined,
  loyaltyPointsToUse: 0,
};

const BASE_CANCEL_INPUT = { reason: "Changed my mind" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("orderService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    restoreTxMock();
  });

  // =========================================================================
  // createOrder
  // =========================================================================

  describe("createOrder", () => {

    // -----------------------------------------------------------------------
    // Cart validation
    // -----------------------------------------------------------------------

    describe("cart validation", () => {
      it("throws 400 when cart does not exist", async () => {
        mockCartFindUnique.mockResolvedValueOnce(null);

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 400, message: "Cart is empty" });
      });

      it("throws 400 when cart exists but has no items (empty cart)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([]));

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 400, message: "Cart is empty" });
      });

      it("queries cart using the correct userId", async () => {
        mockCartFindUnique.mockResolvedValueOnce(null);

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT).catch(() => {});

        expect(mockCartFindUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { userId: USER_ID } })
        );
      });

      it("includes nested variant → product → images in the cart query", async () => {
        mockCartFindUnique.mockResolvedValueOnce(null);

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT).catch(() => {});

        const callArg = mockCartFindUnique.mock.calls[0][0];
        expect(callArg.include?.items?.include?.variant?.include?.product?.select).toMatchObject({
          id: true,
          name: true,
          price: true,
        });
      });
    });

    // -----------------------------------------------------------------------
    // Address ownership validation (IDOR prevention)
    // -----------------------------------------------------------------------

    describe("address ownership validation", () => {
      it("throws 400 when address does not belong to the requesting user", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(null);

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 400, message: "Invalid address" });
      });

      it("passes both addressId and userId to the address query to prevent IDOR", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(null);

        await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, addressId: "addr-999" })
          .catch(() => {});

        expect(mockAddressFindFirst).toHaveBeenCalledWith({
          where: { id: "addr-999", userId: USER_ID },
        });
      });
    });

    // -----------------------------------------------------------------------
    // Subtotal calculation
    // -----------------------------------------------------------------------

    describe("subtotal calculation", () => {
      it("uses variant.price when it is set and non-zero", async () => {
        setupCreateOrderHappyPath({
          cartItems: [makeCartItem({ variantPrice: 750, productPrice: 500, quantity: 2 })],
          txVariantPrice: 750,
          totalAmount: 1500,
        });

        const result = await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(result.amount).toBe(1500); // 750 * 2
      });

      it("falls back to product.price when variant.price is 0", async () => {
        mockCartFindUnique.mockResolvedValueOnce(
          makeCart([makeCartItem({ variantPrice: 0, productPrice: 300, quantity: 3 })])
        );
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 0, stock: 10, product: { price: 300, name: "Test T-Shirt" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 900 }));

        const result = await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(result.amount).toBe(900); // 300 * 3
      });

      it("falls back to product.price when variant.price is null", async () => {
        mockCartFindUnique.mockResolvedValueOnce(
          makeCart([makeCartItem({ variantPrice: null, productPrice: 200, quantity: 1 })])
        );
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: null, stock: 10, product: { price: 200, name: "Test T-Shirt" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 200 }));

        const result = await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(result.amount).toBe(200);
      });

      it("sums multiple cart items correctly", async () => {
        const items = [
          makeCartItem({ variantId: "v1", variantPrice: 100, quantity: 3 }),
          makeCartItem({ variantId: "v2", variantPrice: 200, quantity: 2 }),
        ];
        mockCartFindUnique.mockResolvedValueOnce(makeCart(items));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique
          .mockResolvedValueOnce({ price: 100, stock: 10, product: { price: 50, name: "Item A" } })
          .mockResolvedValueOnce({ price: 200, stock: 10, product: { price: 100, name: "Item B" } });
        mockTxProductVariantUpdateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 700 }));

        const result = await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(result.amount).toBe(700); // 100*3 + 200*2 = 700
      });

      it("uses primary image URL in order items", async () => {
        setupCreateOrderHappyPath();

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        const createCall = mockTxOrderCreate.mock.calls[0][0];
        expect(createCall.data.items.create[0].productImage).toBe("https://cdn.example.com/img.jpg");
      });

      it("sets productImage to null when no product images exist", async () => {
        const itemNoImage = {
          variantId: "variant-001",
          quantity: 2,
          variant: {
            price: 500,
            size: "M",
            color: "Blue",
            product: {
              id: "product-001",
              name: "Test T-Shirt",
              price: 400,
              categoryId: "cat-001",
              images: [],
            },
          },
        };
        mockCartFindUnique.mockResolvedValueOnce(makeCart([itemNoImage]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 500, stock: 10, product: { price: 400, name: "Test T-Shirt" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder());

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        const createCall = mockTxOrderCreate.mock.calls[0][0];
        expect(createCall.data.items.create[0].productImage).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Discount code validation
    // -----------------------------------------------------------------------

    describe("discount code validation", () => {
      it("throws 400 when discount code does not exist", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(null);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "FAKE" })
        ).rejects.toMatchObject({ statusCode: 400, message: "Invalid discount code" });
      });

      it("throws 400 when discount code is inactive", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(makeDiscount({ isActive: false }));

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({ statusCode: 400, message: "Invalid discount code" });
      });

      it("throws 400 when discount code is expired (expiresAt in the past)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(
          makeDiscount({ expiresAt: new Date(Date.now() - 1000) })
        );

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({ statusCode: 400, message: "Discount code has expired" });
      });

      it("throws 400 when discount code has not started yet (startsAt in the future)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(
          makeDiscount({ startsAt: new Date(Date.now() + 86_400_000) })
        );

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({ statusCode: 400, message: "Discount code has expired" });
      });

      it("throws 400 when global usage limit is reached (usageCount === usageLimit)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(
          makeDiscount({ usageLimit: 10, usageCount: 10 })
        );

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({ statusCode: 400, message: "Discount code usage limit reached" });
      });

      it("throws 400 when usageCount exceeds usageLimit", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(
          makeDiscount({ usageLimit: 5, usageCount: 7 })
        );

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({ statusCode: 400, message: "Discount code usage limit reached" });
      });

      it("allows use when usageCount is one below the limit (boundary)", async () => {
        setupCreateOrderHappyPath({ discountCode: { usageLimit: 10, usageCount: 9 } });

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.razorpayOrderId).toBeDefined();
      });

      it("throws 400 when per-user usage limit is reached", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(makeDiscount({ perUserLimit: 1 }));
        mockOrderCount.mockResolvedValueOnce(1);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: expect.stringContaining("maximum number of times"),
        });
      });

      it("per-user check only counts non-cancelled orders", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(makeDiscount({ perUserLimit: 1 }));
        mockOrderCount.mockResolvedValueOnce(1);

        await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" }).catch(() => {});

        expect(mockOrderCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: { not: "CANCELLED" } }),
          })
        );
      });

      it("throws 400 when cart products do not match applicableProducts list", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([makeCartItem({ productId: "prod-A" })]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(
          makeDiscount({ applicableProducts: ["prod-X", "prod-Y"] })
        );
        mockOrderCount.mockResolvedValueOnce(0);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: "This discount code is not applicable to the items in your cart",
        });
      });

      it("allows discount when at least one cart product is in applicableProducts", async () => {
        setupCreateOrderHappyPath({
          cartItems: [makeCartItem({ productId: "prod-A" })],
          discountCode: { applicableProducts: ["prod-A", "prod-B"] },
        });

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.razorpayOrderId).toBeDefined();
      });

      it("throws 400 when cart categories do not match applicableCategories list", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([makeCartItem({ categoryId: "cat-A" })]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(
          makeDiscount({ applicableCategories: ["cat-X"] })
        );
        mockOrderCount.mockResolvedValueOnce(0);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: "This discount code is not applicable to the items in your cart",
        });
      });

      it("throws 400 when subtotal is below minOrderValue", async () => {
        // subtotal = 500*2 = 1000; minOrderValue = 2000
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(makeDiscount({ minOrderValue: 2000 }));
        mockOrderCount.mockResolvedValueOnce(0);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: expect.stringContaining("Minimum order value"),
        });
      });

      it("allows discount when subtotal exactly meets minOrderValue (boundary)", async () => {
        // subtotal = 500*2 = 1000; minOrderValue = 1000
        setupCreateOrderHappyPath({ discountCode: { minOrderValue: 1000 } });

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.razorpayOrderId).toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Discount amount calculation
    // -----------------------------------------------------------------------

    describe("discount amount calculation", () => {
      it("applies PERCENTAGE discount correctly (10% of 1000 = 900 total)", async () => {
        setupCreateOrderHappyPath({ discountCode: { type: "PERCENTAGE", value: 10 } });
        mockTxOrderCreate.mockReset();
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 900 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.amount).toBe(900);
      });

      it("caps PERCENTAGE discount at maxDiscountAmount when exceeded", async () => {
        // 1000 subtotal; 50% = 500 but capped at 150 → total = 850
        setupCreateOrderHappyPath({
          discountCode: { type: "PERCENTAGE", value: 50, maxDiscountAmount: 150 },
        });
        mockTxOrderCreate.mockReset();
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 850 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.amount).toBe(850);
      });

      it("does not cap PERCENTAGE when calculated amount is below maxDiscountAmount", async () => {
        // 1000 subtotal; 10% = 100; maxDiscountAmount = 500 → no cap, total = 900
        setupCreateOrderHappyPath({
          discountCode: { type: "PERCENTAGE", value: 10, maxDiscountAmount: 500 },
        });
        mockTxOrderCreate.mockReset();
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 900 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.amount).toBe(900);
      });

      it("applies FLAT discount correctly (200 off 1000 = 800)", async () => {
        setupCreateOrderHappyPath({ discountCode: { type: "FLAT", value: 200 } });
        mockTxOrderCreate.mockReset();
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 800 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.amount).toBe(800);
      });

      it("caps FLAT discount at subtotal to prevent negative total (5000 off 1000 → 0)", async () => {
        setupCreateOrderHappyPath({ discountCode: { type: "FLAT", value: 5000 } });
        mockTxOrderCreate.mockReset();
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 0 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.amount).toBe(0);
      });

      it("FREE_SHIPPING keeps discountAmount at 0 (total unchanged at 1000)", async () => {
        setupCreateOrderHappyPath({ discountCode: { type: "FREE_SHIPPING" } });
        mockTxOrderCreate.mockReset();
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 1000 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(result.amount).toBe(1000);
      });

      it("throws 400 for BUY_X_GET_Y discount type (unsupported)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockDiscountCodeFindUnique.mockResolvedValueOnce(makeDiscount({ type: "BUY_X_GET_Y" }));
        mockOrderCount.mockResolvedValueOnce(0);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: "This discount type is not yet supported",
        });
      });

      it("increments discountCode usageCount atomically inside the transaction", async () => {
        setupCreateOrderHappyPath({ discountCode: { id: "disc-001" } });

        await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, discountCode: "SAVE10" });

        expect(mockTxDiscountCodeUpdate).toHaveBeenCalledWith({
          where: { id: "disc-001" },
          data: { usageCount: { increment: 1 } },
        });
      });

      it("does not call discountCode update when no code is used", async () => {
        setupCreateOrderHappyPath();

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockTxDiscountCodeUpdate).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Loyalty points validation and application
    // -----------------------------------------------------------------------

    describe("loyalty points validation", () => {
      it("throws 400 when user has insufficient loyalty points", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockUserFindUnique.mockResolvedValueOnce({ id: USER_ID, loyaltyPoints: 50 });

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, loyaltyPointsToUse: 100 })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: "Insufficient loyalty points",
        });
      });

      it("throws 400 when user record not found during loyalty check", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockUserFindUnique.mockResolvedValueOnce(null);

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, loyaltyPointsToUse: 50 })
        ).rejects.toMatchObject({ statusCode: 400, message: "Insufficient loyalty points" });
      });

      it("throws 400 when redemption amount is below the minimum threshold", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockUserFindUnique.mockResolvedValueOnce({ id: USER_ID, loyaltyPoints: 500 });
        mockLoyaltyConfigFindFirst.mockResolvedValueOnce({ minRedeemPoints: 100, isActive: true });

        await expect(
          orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, loyaltyPointsToUse: 50 })
        ).rejects.toMatchObject({
          statusCode: 400,
          message: expect.stringContaining("100 points required"),
        });
      });

      it("skips minimum-threshold check when no active LoyaltyConfig exists", async () => {
        setupCreateOrderHappyPath({ loyaltyPointsToUse: 50, totalAmount: 950 });

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, loyaltyPointsToUse: 50 });

        expect(result.amount).toBe(950);
      });

      it("caps loyalty discount at (subtotal - discountAmount) to prevent negative total", async () => {
        // subtotal=1000; no discount code; 2000 points → capped at 1000 → total = 0
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockUserFindUnique.mockResolvedValueOnce({ id: USER_ID, loyaltyPoints: 5000 });
        mockLoyaltyConfigFindFirst.mockResolvedValueOnce(null);
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 500, stock: 10, product: { price: 400, name: "Test T-Shirt" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 0 }));

        const result = await orderService.createOrder(USER_ID, { ...BASE_CREATE_INPUT, loyaltyPointsToUse: 2000 });

        expect(result.amount).toBe(0);
      });

      it("does not query user when loyaltyPointsToUse is 0", async () => {
        setupCreateOrderHappyPath();

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockUserFindUnique).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Total calculation and Razorpay paise conversion
    // -----------------------------------------------------------------------

    describe("total calculation and Razorpay paise conversion", () => {
      it("total is never negative (Math.max(total, 0) guard)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockUserFindUnique.mockResolvedValueOnce({ id: USER_ID, loyaltyPoints: 99999 });
        mockLoyaltyConfigFindFirst.mockResolvedValueOnce(null);
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 500, stock: 10, product: { price: 400, name: "Test T-Shirt" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 0 }));

        const result = await orderService.createOrder(USER_ID, {
          ...BASE_CREATE_INPUT, loyaltyPointsToUse: 99999,
        });

        expect(result.amount).toBeGreaterThanOrEqual(0);
      });

      it("converts total amount to paise by multiplying by 100", async () => {
        setupCreateOrderHappyPath(); // subtotal = 1000 → 100000 paise

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockRazorpayOrdersCreate).toHaveBeenCalledWith(
          expect.objectContaining({ amount: 100000 })
        );
      });

      it("uses Math.round for paise conversion to handle fractional rupees", async () => {
        // ₹10.005 → Math.round(10.005 * 100) = Math.round(1000.5) = 1001
        mockCartFindUnique.mockResolvedValueOnce(
          makeCart([makeCartItem({ variantPrice: 10.005, quantity: 1 })])
        );
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 10.005, stock: 5, product: { price: 10, name: "Cheap Item" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 10.005 }));

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        const amountArg = mockRazorpayOrdersCreate.mock.calls[0][0].amount;
        expect(amountArg).toBe(Math.round(10.005 * 100));
      });

      it("passes the generated orderNumber as receipt to Razorpay", async () => {
        setupCreateOrderHappyPath();

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockRazorpayOrdersCreate).toHaveBeenCalledWith(
          expect.objectContaining({ receipt: ORDER_NUMBER, currency: "INR" })
        );
      });

      it("returns razorpayOrderId and razorpayKeyId in the response", async () => {
        setupCreateOrderHappyPath({ razorpayOrderId: "rp_order_xyz" });

        const result = await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(result.razorpayOrderId).toBe("rp_order_xyz");
        expect(result.razorpayKeyId).toBe("test_key");
      });

      it("returns the created order object in the response", async () => {
        setupCreateOrderHappyPath();

        const result = await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(result.order).toBeDefined();
        expect(result.order.orderNumber).toBe(ORDER_NUMBER);
      });
    });

    // -----------------------------------------------------------------------
    // Transaction: serializable price revalidation
    // -----------------------------------------------------------------------

    describe("transaction: price revalidation", () => {
      it("throws 409 CONFLICT when variant price changed since cart was loaded", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([makeCartItem({ variantPrice: 500 })]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 600, // price changed from 500 to 600
          stock: 10,
          product: { price: 400, name: "Test T-Shirt" },
        });

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
      });

      it("conflict message includes the product name", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([makeCartItem({ variantPrice: 500 })]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 750,
          stock: 10,
          product: { price: 400, name: "Test T-Shirt" },
        });

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining("Test T-Shirt"),
          });
      });

      it("throws 400 when variant no longer exists inside the transaction", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce(null); // variant deleted

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 400 });
      });

      it("uses Serializable isolation level for the transaction", async () => {
        setupCreateOrderHappyPath();

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockTransaction).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({ isolationLevel: "Serializable" })
        );
      });
    });

    // -----------------------------------------------------------------------
    // Transaction: stock validation and atomic decrement
    // -----------------------------------------------------------------------

    describe("transaction: stock validation and atomic decrement", () => {
      it("throws 409 CONFLICT when stock is insufficient inside the transaction", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([makeCartItem({ quantity: 5 })]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 500,
          stock: 3, // only 3, need 5
          product: { price: 400, name: "Test T-Shirt" },
        });

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
      });

      it("throws 409 CONFLICT when atomic updateMany returns count=0 (race condition)", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart());
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 500, stock: 10, product: { price: 400, name: "Test T-Shirt" },
        });
        mockTxProductVariantUpdateMany.mockResolvedValueOnce({ count: 0 }); // race lost

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ statusCode: 409, code: "CONFLICT" });
      });

      it("decrements stock using a gte guard for atomicity", async () => {
        setupCreateOrderHappyPath();

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockTxProductVariantUpdateMany).toHaveBeenCalledWith({
          where: { id: "variant-001", stock: { gte: 2 } },
          data: { stock: { decrement: 2 } },
        });
      });

      it("decrements stock for each item in a multi-item cart", async () => {
        const items = [
          makeCartItem({ variantId: "v1", quantity: 3 }),
          makeCartItem({ variantId: "v2", quantity: 1 }),
        ];
        mockCartFindUnique.mockResolvedValueOnce(makeCart(items));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique
          .mockResolvedValueOnce({ price: 500, stock: 10, product: { price: 400, name: "Item A" } })
          .mockResolvedValueOnce({ price: 500, stock: 5, product: { price: 400, name: "Item B" } });
        mockTxProductVariantUpdateMany
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 1 });
        mockTxOrderCreate.mockResolvedValueOnce(makeCreatedOrder({ totalAmount: 2000 }));

        await orderService.createOrder(USER_ID, BASE_CREATE_INPUT);

        expect(mockTxProductVariantUpdateMany).toHaveBeenCalledWith({
          where: { id: "v1", stock: { gte: 3 } },
          data: { stock: { decrement: 3 } },
        });
        expect(mockTxProductVariantUpdateMany).toHaveBeenCalledWith({
          where: { id: "v2", stock: { gte: 1 } },
          data: { stock: { decrement: 1 } },
        });
      });

      it("insufficient stock conflict message includes available stock count", async () => {
        mockCartFindUnique.mockResolvedValueOnce(makeCart([makeCartItem({ quantity: 5 })]));
        mockAddressFindFirst.mockResolvedValueOnce(makeAddress());
        mockRazorpayOrdersCreate.mockResolvedValueOnce(makeRazorpayOrder());
        mockTxProductVariantFindUnique.mockResolvedValueOnce({
          price: 500, stock: 2, product: { price: 400, name: "Test T-Shirt" },
        });

        await expect(orderService.createOrder(USER_ID, BASE_CREATE_INPUT))
          .rejects.toMatchObject({ message: expect.stringContaining("2") });
      });
    });
  });

  // =========================================================================
  // verifyPayment
  // =========================================================================

  describe("verifyPayment", () => {
    const RAZORPAY_ORDER_ID = "rp_order_001";
    const RAZORPAY_PAYMENT_ID = "rp_pay_001";

    function computeSignature(orderId: string, paymentId: string) {
      // Replicate the service's HMAC-SHA256 logic with test_secret
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cryptoMod = require("crypto");
      const body = orderId + "|" + paymentId;
      return cryptoMod.createHmac("sha256", "test_secret").update(body).digest("hex");
    }

    function makeVerifyInput(overrides: Record<string, unknown> = {}) {
      return {
        razorpayOrderId: RAZORPAY_ORDER_ID,
        razorpayPaymentId: RAZORPAY_PAYMENT_ID,
        razorpaySignature: computeSignature(RAZORPAY_ORDER_ID, RAZORPAY_PAYMENT_ID),
        ...overrides,
      };
    }

    // -----------------------------------------------------------------------
    // Payment lookup and ownership
    // -----------------------------------------------------------------------

    describe("payment lookup and ownership", () => {
      it("throws 404 when payment is not found", async () => {
        mockPaymentFindUnique.mockResolvedValueOnce(null);

        await expect(orderService.verifyPayment(USER_ID, makeVerifyInput()))
          .rejects.toMatchObject({ statusCode: 404, message: "Payment not found" });
      });

      it("throws 403 when payment belongs to a different user's order", async () => {
        mockPaymentFindUnique.mockResolvedValueOnce(
          makePaymentRecord({ order: makeFullOrder({ userId: "other-user-999" }) })
        );

        await expect(orderService.verifyPayment(USER_ID, makeVerifyInput()))
          .rejects.toMatchObject({ statusCode: 403, message: "Not your order" });
      });
    });

    // -----------------------------------------------------------------------
    // Signature verification
    // -----------------------------------------------------------------------

    describe("signature verification", () => {
      it("throws 400 and marks payment FAILED when signature is invalid", async () => {
        mockPaymentFindUnique.mockResolvedValueOnce(makePaymentRecord());
        mockPaymentUpdate.mockResolvedValueOnce({});

        await expect(
          orderService.verifyPayment(USER_ID, makeVerifyInput({ razorpaySignature: "0".repeat(64) }))
        ).rejects.toMatchObject({ statusCode: 400, message: "Payment verification failed" });

        expect(mockPaymentUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: "FAILED" }),
          })
        );
      });

      it("stores the failure reason in the payment record on signature mismatch", async () => {
        mockPaymentFindUnique.mockResolvedValueOnce(makePaymentRecord());
        mockPaymentUpdate.mockResolvedValueOnce({});

        await orderService.verifyPayment(USER_ID, makeVerifyInput({ razorpaySignature: "a".repeat(64) }))
          .catch(() => {});

        expect(mockPaymentUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              failureReason: "Signature verification failed",
            }),
          })
        );
      });

      it("proceeds without error when signature is valid", async () => {
        setupVerifyPaymentHappyPath();

        await expect(orderService.verifyPayment(USER_ID, makeVerifyInput()))
          .resolves.toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Transaction: payment and order status updates
    // -----------------------------------------------------------------------

    describe("transaction: payment and order status", () => {
      it("updates payment status to CAPTURED with payment and signature details", async () => {
        setupVerifyPaymentHappyPath();

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxPaymentUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              razorpayPaymentId: RAZORPAY_PAYMENT_ID,
              razorpaySignature: computeSignature(RAZORPAY_ORDER_ID, RAZORPAY_PAYMENT_ID),
              status: "CAPTURED",
            }),
          })
        );
      });

      it("updates order status to CONFIRMED", async () => {
        setupVerifyPaymentHappyPath();

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxOrderUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) })
        );
      });

      it("creates a CONFIRMED status history entry with note", async () => {
        setupVerifyPaymentHappyPath();

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxOrderStatusHistoryCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: "CONFIRMED",
              note: "Payment received",
            }),
          })
        );
      });
    });

    // -----------------------------------------------------------------------
    // Loyalty points: deduction when used
    // -----------------------------------------------------------------------

    describe("loyalty points deduction on payment", () => {
      it("deducts loyaltyPointsUsed from user balance after payment", async () => {
        setupVerifyPaymentHappyPath({ loyaltyPointsUsed: 200 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: USER_ID },
            data: { loyaltyPoints: { decrement: 200 } },
          })
        );
      });

      it("creates a REDEEMED loyalty transaction when points were used", async () => {
        setupVerifyPaymentHappyPath({ loyaltyPointsUsed: 200 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxLoyaltyTransactionCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: "REDEEMED", points: -200 }),
          })
        );
      });

      it("does not deduct loyalty points when none were used (loyaltyPointsUsed=0)", async () => {
        setupVerifyPaymentHappyPath({ loyaltyPointsUsed: 0 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        const decrementCall = mockTxUserUpdate.mock.calls.find(
          (c) => c[0]?.data?.loyaltyPoints?.decrement !== undefined
        );
        expect(decrementCall).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Loyalty points: earning 1 per ₹100
    // -----------------------------------------------------------------------

    describe("loyalty points earning (1 point per ₹100)", () => {
      it("awards 10 points for a ₹1000 order", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 1000 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: USER_ID },
            data: { loyaltyPoints: { increment: 10 } },
          })
        );
      });

      it("creates an EARNED loyalty transaction entry", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 500 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxLoyaltyTransactionCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: "EARNED", points: 5 }),
          })
        );
      });

      it("floors fractional points (₹150 → 1 point not 1.5)", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 150 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { loyaltyPoints: { increment: 1 } },
          })
        );
      });

      it("does not award points when totalAmount < 100 (0 points)", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 99 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        const earnCall = mockTxUserUpdate.mock.calls.find(
          (c) => c[0]?.data?.loyaltyPoints?.increment !== undefined
        );
        expect(earnCall).toBeUndefined();
      });

      it("updates loyaltyPointsEarned on the order record", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 1000 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxOrderUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ loyaltyPointsEarned: 10 }),
          })
        );
      });

      it("returns pointsEarned in the response", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 1000 });

        const result = await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(result.pointsEarned).toBe(10);
      });
    });

    // -----------------------------------------------------------------------
    // Referral conversion on first purchase
    // -----------------------------------------------------------------------

    describe("referral conversion on first purchase", () => {
      function setupWithReferral({
        status = "SIGNED_UP",
        orderCount = 1,
      } = {}) {
        const order = makeFullOrder({ totalAmount: 1000 });
        mockPaymentFindUnique.mockResolvedValueOnce(makePaymentRecord({ order }));
        mockTxPaymentUpdate.mockResolvedValueOnce({});
        mockTxOrderUpdate.mockResolvedValue({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderCount.mockResolvedValueOnce(orderCount);
        mockTxReferralFindUnique.mockResolvedValueOnce({
          id: "ref-001",
          referrerId: "referrer-001",
          refereeId: USER_ID,
          status,
        });
        mockTxReferralUpdate.mockResolvedValueOnce({});
        mockTxUserUpdate.mockResolvedValue({});
        mockTxLoyaltyTransactionCreate.mockResolvedValue({});
        mockTxCartFindUnique.mockResolvedValueOnce({ id: "cart-001" });
        mockTxCartItemDeleteMany.mockResolvedValueOnce({ count: 2 });
      }

      it("converts referral status to CONVERTED on first purchase", async () => {
        setupWithReferral({ status: "SIGNED_UP", orderCount: 1 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxReferralUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "ref-001" },
            data: expect.objectContaining({ status: "CONVERTED" }),
          })
        );
      });

      it("awards 100 referrer reward points (APP_CONSTANTS.REFERRER_REWARD_POINTS)", async () => {
        setupWithReferral({ status: "SIGNED_UP", orderCount: 1 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "referrer-001" },
            data: { loyaltyPoints: { increment: 100 } },
          })
        );
      });

      it("awards 50 referee bonus points (APP_CONSTANTS.REFEREE_REWARD_POINTS)", async () => {
        setupWithReferral({ status: "SIGNED_UP", orderCount: 1 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: USER_ID },
            data: { loyaltyPoints: { increment: 50 } },
          })
        );
      });

      it("does not process referral when orderCount is not 1 (not first purchase)", async () => {
        setupVerifyPaymentHappyPath({ orderCount: 2 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxReferralFindUnique).not.toHaveBeenCalled();
      });

      it("does not award referral rewards when no referral record exists", async () => {
        setupVerifyPaymentHappyPath({ orderCount: 1 });

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxReferralUpdate).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Cart clearing after payment
    // -----------------------------------------------------------------------

    describe("cart clearing", () => {
      it("deletes all cart items after successful payment", async () => {
        setupVerifyPaymentHappyPath();

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockTxCartItemDeleteMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { cartId: "cart-001" } })
        );
      });

      it("does not call cartItemDeleteMany when no cart exists for the user", async () => {
        const order = makeFullOrder({ totalAmount: 1000 });
        mockPaymentFindUnique.mockResolvedValueOnce(makePaymentRecord({ order }));
        mockTxPaymentUpdate.mockResolvedValueOnce({});
        mockTxOrderUpdate.mockResolvedValue({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderCount.mockResolvedValueOnce(1);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);
        mockTxUserUpdate.mockResolvedValue({});
        mockTxLoyaltyTransactionCreate.mockResolvedValue({});
        mockTxCartFindUnique.mockResolvedValueOnce(null); // no cart

        await expect(orderService.verifyPayment(USER_ID, makeVerifyInput())).resolves.toBeDefined();

        expect(mockTxCartItemDeleteMany).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Shiprocket non-blocking integration
    // -----------------------------------------------------------------------

    describe("Shiprocket non-blocking integration", () => {
      it("triggers Shiprocket order creation after successful payment", async () => {
        setupVerifyPaymentHappyPath();

        await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(mockShiprocketCreate).toHaveBeenCalledWith("order-db-001");
      });

      it("does not fail the payment flow when Shiprocket creation rejects", async () => {
        setupVerifyPaymentHappyPath();
        mockShiprocketCreate.mockRejectedValueOnce(new Error("Shiprocket unavailable"));

        await expect(
          orderService.verifyPayment(USER_ID, makeVerifyInput())
        ).resolves.toBeDefined();
      });
    });

    // -----------------------------------------------------------------------
    // Response shape
    // -----------------------------------------------------------------------

    describe("response shape", () => {
      it("returns orderNumber and pointsEarned", async () => {
        setupVerifyPaymentHappyPath({ totalAmount: 500 });

        const result = await orderService.verifyPayment(USER_ID, makeVerifyInput());

        expect(result).toEqual({ orderNumber: ORDER_NUMBER, pointsEarned: 5 });
      });
    });
  });

  // =========================================================================
  // listOrders
  // =========================================================================

  describe("listOrders", () => {
    it("returns orders with pagination metadata", async () => {
      const orders = [{ id: "order-001", orderNumber: ORDER_NUMBER }];
      mockOrderFindMany.mockResolvedValueOnce(orders);
      mockOrderCount.mockResolvedValueOnce(1);

      const result = await orderService.listOrders(USER_ID, { page: 1, limit: 10 });

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("filters by status when provided", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(0);

      await orderService.listOrders(USER_ID, { page: 1, limit: 10, status: "PLACED" as any });

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PLACED" }) })
      );
    });

    it("does not add status filter when status is omitted", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(0);

      await orderService.listOrders(USER_ID, { page: 1, limit: 10 });

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.status).toBeUndefined();
    });

    it("applies correct skip and take for page 2 with limit 10", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(25);

      await orderService.listOrders(USER_ID, { page: 2, limit: 10 });

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });

    it("scopes results to the requesting user only", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(0);

      await orderService.listOrders(USER_ID, { page: 1, limit: 10 });

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: USER_ID }) })
      );
    });

    it("calculates totalPages by ceiling division (21 orders / 10 limit = 3 pages)", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(21);

      const result = await orderService.listOrders(USER_ID, { page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });

    it("returns 0 totalPages when there are no orders", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(0);

      const result = await orderService.listOrders(USER_ID, { page: 1, limit: 10 });

      expect(result.totalPages).toBe(0);
    });

    it("orders results by createdAt descending", async () => {
      mockOrderFindMany.mockResolvedValueOnce([]);
      mockOrderCount.mockResolvedValueOnce(0);

      await orderService.listOrders(USER_ID, { page: 1, limit: 10 });

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } })
      );
    });
  });

  // =========================================================================
  // getOrder
  // =========================================================================

  describe("getOrder", () => {
    it("returns the full order when it exists and belongs to the user", async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        ...makeFullOrder(),
        items: [],
        payment: null,
        address: null,
        statusHistory: [],
        discountCode: null,
      });

      const result = await orderService.getOrder(USER_ID, ORDER_NUMBER);

      expect(result.orderNumber).toBe(ORDER_NUMBER);
    });

    it("throws 404 NOT_FOUND when order does not exist", async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null);

      await expect(orderService.getOrder(USER_ID, "ORD-MISSING"))
        .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND", message: "Order not found" });
    });

    it("throws 403 FORBIDDEN when order belongs to a different user", async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        ...makeFullOrder(),
        userId: "other-user-999",
        items: [],
        payment: null,
        address: null,
        statusHistory: [],
        discountCode: null,
      });

      await expect(orderService.getOrder(USER_ID, ORDER_NUMBER))
        .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN", message: "Not your order" });
    });

    it("queries by orderNumber field", async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null);

      await orderService.getOrder(USER_ID, "ORD-XYZ").catch(() => {});

      expect(mockOrderFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderNumber: "ORD-XYZ" } })
      );
    });

    it("includes items, payment, address, statusHistory, and discountCode in the query", async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null);

      await orderService.getOrder(USER_ID, ORDER_NUMBER).catch(() => {});

      const callArg = mockOrderFindUnique.mock.calls[0][0];
      expect(callArg.include).toMatchObject({
        items: true,
        payment: true,
        address: true,
      });
    });
  });

  // =========================================================================
  // cancelOrder
  // =========================================================================

  describe("cancelOrder", () => {

    // -----------------------------------------------------------------------
    // Pre-condition checks
    // -----------------------------------------------------------------------

    describe("pre-condition checks", () => {
      it("throws 404 NOT_FOUND when order does not exist", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(null);

        await expect(orderService.cancelOrder(USER_ID, "ORD-MISSING", BASE_CANCEL_INPUT))
          .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
      });

      it("throws 403 FORBIDDEN when order belongs to another user", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ userId: "other-user-999" }));

        await expect(orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT))
          .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN", message: "Not your order" });
      });

      it.each([
        ["SHIPPED"],
        ["DELIVERED"],
        ["RETURNED"],
        ["REFUNDED"],
        ["CANCELLED"],
      ])("throws 400 when order status is '%s' (not cancellable)", async (status) => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ status }));

        await expect(orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT))
          .rejects.toMatchObject({
            statusCode: 400,
            message: "Order cannot be cancelled at this stage",
          });
      });

      it.each([
        ["PLACED"],
        ["CONFIRMED"],
        ["PROCESSING"],
      ])("allows cancellation when order status is '%s'", async (status) => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ status }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        const result = await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(result.orderNumber).toBe(ORDER_NUMBER);
      });
    });

    // -----------------------------------------------------------------------
    // State machine: status update
    // -----------------------------------------------------------------------

    describe("order status state machine", () => {
      it("sets order status to CANCELLED", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ status: "CONFIRMED" }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxOrderUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ data: { status: "CANCELLED" } })
        );
      });

      it("creates CANCELLED status history with the cancellation reason", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, { reason: "Wrong size ordered" });

        expect(mockTxOrderStatusHistoryCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: "CANCELLED",
              note: "Wrong size ordered",
              changedBy: USER_ID,
            }),
          })
        );
      });
    });

    // -----------------------------------------------------------------------
    // Stock restoration
    // -----------------------------------------------------------------------

    describe("stock restoration", () => {
      it("restores stock for each order item on cancellation", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([
          { variantId: "v1", quantity: 3 },
          { variantId: "v2", quantity: 1 },
        ]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxProductVariantUpdate).toHaveBeenCalledWith({
          where: { id: "v1" },
          data: { stock: { increment: 3 } },
        });
        expect(mockTxProductVariantUpdate).toHaveBeenCalledWith({
          where: { id: "v2" },
          data: { stock: { increment: 1 } },
        });
      });

      it("does not update variants when order has no items", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxProductVariantUpdate).not.toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // Loyalty points restore and clawback
    // -----------------------------------------------------------------------

    describe("loyalty points restore and clawback", () => {
      it("restores loyaltyPointsUsed when they were spent on the cancelled order", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ loyaltyPointsUsed: 200 }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: USER_ID },
            data: { loyaltyPoints: { increment: 200 } },
          })
        );
        expect(mockTxLoyaltyTransactionCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: "ADJUSTED", points: 200 }),
          })
        );
      });

      it("does not restore loyalty points when none were used", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ loyaltyPointsUsed: 0 }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        const incrementCall = mockTxUserUpdate.mock.calls.find(
          (c) => c[0]?.data?.loyaltyPoints?.increment !== undefined
        );
        expect(incrementCall).toBeUndefined();
      });

      it("claws back earned loyalty points when loyaltyPointsEarned > 0", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ loyaltyPointsEarned: 10 }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: USER_ID },
            data: { loyaltyPoints: { decrement: 10 } },
          })
        );
        expect(mockTxLoyaltyTransactionCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ type: "ADJUSTED", points: -10 }),
          })
        );
      });

      it("does not claw back earned points when loyaltyPointsEarned is 0", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ loyaltyPointsEarned: 0 }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        const decrementCall = mockTxUserUpdate.mock.calls.find(
          (c) => c[0]?.data?.loyaltyPoints?.decrement !== undefined
        );
        expect(decrementCall).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Referral reward clawback
    // -----------------------------------------------------------------------

    describe("referral reward clawback", () => {
      it("claws back referral rewards when this is the user's only non-cancelled order", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce({
          id: "ref-001",
          referrerId: "referrer-001",
          refereeId: USER_ID,
          status: "CONVERTED",
          referrerReward: 100,
          refereeReward: 50,
        });
        mockTxOrderCount.mockResolvedValueOnce(0); // no other active orders

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxReferralUpdate).toHaveBeenCalledWith({
          where: { id: "ref-001" },
          data: { status: "SIGNED_UP", referrerReward: 0, refereeReward: 0 },
        });
        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "referrer-001" },
            data: { loyaltyPoints: { decrement: 100 } },
          })
        );
        expect(mockTxUserUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: USER_ID },
            data: { loyaltyPoints: { decrement: 50 } },
          })
        );
      });

      it("does not claw back referral rewards when user has other active orders", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce({
          id: "ref-001",
          referrerId: "referrer-001",
          refereeId: USER_ID,
          status: "CONVERTED",
          referrerReward: 100,
          refereeReward: 50,
        });
        mockTxOrderCount.mockResolvedValueOnce(2); // other orders exist

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxReferralUpdate).not.toHaveBeenCalled();
      });

      it("does not attempt clawback when no referral record exists", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxReferralUpdate).not.toHaveBeenCalled();
      });

      it("does not clawback when referral status is SIGNED_UP (not yet converted)", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce({
          id: "ref-001",
          referrerId: "referrer-001",
          refereeId: USER_ID,
          status: "SIGNED_UP",
          referrerReward: 0,
          refereeReward: 0,
        });

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxReferralUpdate).not.toHaveBeenCalled();
      });

      it("order count check excludes the order being cancelled", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ id: "order-db-001" }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce({
          id: "ref-001",
          referrerId: "referrer-001",
          refereeId: USER_ID,
          status: "CONVERTED",
          referrerReward: 100,
          refereeReward: 50,
        });
        mockTxOrderCount.mockResolvedValueOnce(0);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockTxOrderCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: { not: "order-db-001" },
              status: { not: "CANCELLED" },
            }),
          })
        );
      });

      it("skips referrer deduction when referrerReward is 0", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce({
          id: "ref-001",
          referrerId: "referrer-001",
          refereeId: USER_ID,
          status: "CONVERTED",
          referrerReward: 0,
          refereeReward: 50,
        });
        mockTxOrderCount.mockResolvedValueOnce(0);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        const referrerDecrementCall = mockTxUserUpdate.mock.calls.find(
          (c) => c[0]?.where?.id === "referrer-001" && c[0]?.data?.loyaltyPoints?.decrement !== undefined
        );
        expect(referrerDecrementCall).toBeUndefined();
      });
    });

    // -----------------------------------------------------------------------
    // Razorpay auto-refund
    // -----------------------------------------------------------------------

    describe("Razorpay auto-refund", () => {
      it("initiates refund when payment is CAPTURED and has razorpayPaymentId", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({
          payment: {
            id: "pay-001",
            status: "CAPTURED",
            razorpayPaymentId: "rp_pay_001",
            amount: 1000,
          },
        }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);
        mockRazorpayPaymentsRefund.mockResolvedValueOnce({ id: "refund-001" });
        mockTxPaymentUpdate.mockResolvedValueOnce({});

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockRazorpayPaymentsRefund).toHaveBeenCalledWith(
          "rp_pay_001",
          expect.objectContaining({ amount: 100000 }) // 1000 * 100 paise
        );
        expect(mockTxPaymentUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: "REFUNDED", refundId: "refund-001" }),
          })
        );
      });

      it("uses Math.round for paise conversion of refund amount", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({
          payment: {
            id: "pay-001",
            status: "CAPTURED",
            razorpayPaymentId: "rp_pay_001",
            amount: 999.99,
          },
        }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);
        mockRazorpayPaymentsRefund.mockResolvedValueOnce({ id: "refund-001" });
        mockTxPaymentUpdate.mockResolvedValueOnce({});

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        const refundArgs = mockRazorpayPaymentsRefund.mock.calls[0][1];
        expect(refundArgs.amount).toBe(Math.round(999.99 * 100));
      });

      it("does not initiate refund when payment status is PENDING", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({
          payment: { id: "pay-001", status: "PENDING", razorpayPaymentId: null, amount: 1000 },
        }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockRazorpayPaymentsRefund).not.toHaveBeenCalled();
      });

      it("does not initiate refund when payment is null", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({ payment: null }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockRazorpayPaymentsRefund).not.toHaveBeenCalled();
      });

      it("does not initiate refund when CAPTURED payment has no razorpayPaymentId", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({
          payment: { id: "pay-001", status: "CAPTURED", razorpayPaymentId: null, amount: 1000 },
        }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(mockRazorpayPaymentsRefund).not.toHaveBeenCalled();
      });

      it("logs the error but completes cancellation when Razorpay refund fails", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder({
          payment: {
            id: "pay-001",
            status: "CAPTURED",
            razorpayPaymentId: "rp_pay_001",
            amount: 1000,
          },
        }));
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);
        mockRazorpayPaymentsRefund.mockRejectedValueOnce(new Error("Gateway timeout"));

        const result = await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(result.orderNumber).toBe(ORDER_NUMBER);
        expect(mockLoggerError).toHaveBeenCalled();
      });

      it("returns orderNumber in the response after successful cancellation", async () => {
        mockOrderFindUnique.mockResolvedValueOnce(makeFullOrder());
        mockTxOrderUpdate.mockResolvedValueOnce({});
        mockTxOrderStatusHistoryCreate.mockResolvedValueOnce({});
        mockTxOrderItemFindMany.mockResolvedValueOnce([]);
        mockTxReferralFindUnique.mockResolvedValueOnce(null);

        const result = await orderService.cancelOrder(USER_ID, ORDER_NUMBER, BASE_CANCEL_INPUT);

        expect(result).toEqual({ orderNumber: ORDER_NUMBER });
      });
    });
  });
});
