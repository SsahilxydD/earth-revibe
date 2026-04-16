import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mocks so they are available before any imports are processed
// ---------------------------------------------------------------------------
const { mockDiscountCode, mockOrder } = vi.hoisted(() => ({
  mockDiscountCode: { findUnique: vi.fn() },
  mockOrder: { count: vi.fn() },
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    discountCode: mockDiscountCode,
    order: mockOrder,
  },
}));

// Import after mocks are registered
import { discountService } from '../discount.service';

// ---------------------------------------------------------------------------
// Shared test fixture helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `offsetMs` milliseconds from now (negative = past). */
const dateOffset = (offsetMs: number): Date => new Date(Date.now() + offsetMs);

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Build a valid discount code record with sensible defaults.
 * Individual tests override only the fields they care about.
 */
function makeDiscount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'disc-1',
    code: 'SAVE10',
    isActive: true,
    startsAt: dateOffset(-ONE_DAY), // started yesterday
    expiresAt: dateOffset(ONE_DAY), // expires tomorrow
    usageCount: 0,
    usageLimit: null, // null = unlimited by default
    perUserLimit: 1,
    minOrderValue: null,
    type: 'PERCENTAGE',
    value: '10', // Prisma Decimal comes back as string-like
    maxDiscountAmount: null,
    description: '10% off your order',
    ...overrides,
  };
}

const VALID_INPUT = { code: 'SAVE10', orderTotal: 1000 };

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: discount exists and user has never used it
  mockDiscountCode.findUnique.mockResolvedValue(makeDiscount());
  mockOrder.count.mockResolvedValue(0);
});

// ===========================================================================
// 1. Discount lookup & isActive guard
// ===========================================================================

describe('validateDiscount — lookup & active check', () => {
  it("throws 'Invalid discount code' when discount is not found", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid discount code',
    });
  });

  it("throws 'Invalid discount code' when discount exists but isActive is false", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ isActive: false }));

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid discount code',
    });
  });

  it('proceeds when discount is found and isActive is true', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount());

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(result.valid).toBe(true);
  });

  it('queries prisma with the exact code provided', async () => {
    await discountService.validateDiscount({ code: 'MYCODE', orderTotal: 500 });

    expect(mockDiscountCode.findUnique).toHaveBeenCalledWith({
      where: { code: 'MYCODE' },
    });
  });
});

// ===========================================================================
// 2. Date range validation
// ===========================================================================

describe('validateDiscount — date range', () => {
  it("throws 'Discount code has expired' when expiresAt is in the past", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ expiresAt: dateOffset(-ONE_HOUR) })
    );

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Discount code has expired',
    });
  });

  it("throws 'Discount code has expired' when startsAt is in the future", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ startsAt: dateOffset(ONE_HOUR) }));

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Discount code has expired',
    });
  });

  it('succeeds when current time is exactly within the valid date window', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({
        startsAt: dateOffset(-ONE_HOUR),
        expiresAt: dateOffset(ONE_HOUR),
      })
    );

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// 3. Global usage limit
// ===========================================================================

describe('validateDiscount — global usage limit', () => {
  it("throws 'usage limit reached' when usageCount equals usageLimit", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ usageCount: 100, usageLimit: 100 })
    );

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Discount code usage limit reached',
    });
  });

  it("throws 'usage limit reached' when usageCount exceeds usageLimit", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ usageCount: 101, usageLimit: 100 })
    );

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Discount code usage limit reached',
    });
  });

  it('succeeds when usageCount is one below usageLimit', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ usageCount: 99, usageLimit: 100 })
    );

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(result.valid).toBe(true);
  });

  it('treats null usageLimit as unlimited — never throws regardless of usageCount', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ usageCount: 99999, usageLimit: null })
    );

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(result.valid).toBe(true);
  });

  it('throws when usageLimit is zero (0 uses allowed)', async () => {
    // Source uses `usageLimit != null` — 0 is not null, so limit check runs.
    // usageCount(0) >= usageLimit(0) is true → throws.
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ usageCount: 0, usageLimit: 0 }));

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('usage limit'),
    });
  });
});

// ===========================================================================
// 4. Per-user limit
// ===========================================================================

describe('validateDiscount — per-user limit', () => {
  it('throws when user has already used the code perUserLimit times', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ perUserLimit: 1 }));
    mockOrder.count.mockResolvedValue(1);

    await expect(discountService.validateDiscount(VALID_INPUT, 'user-123')).rejects.toMatchObject({
      statusCode: 400,
      message: 'You have already used this discount code the maximum number of times',
    });
  });

  it('throws when user usage count exceeds perUserLimit', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ perUserLimit: 2 }));
    mockOrder.count.mockResolvedValue(3);

    await expect(discountService.validateDiscount(VALID_INPUT, 'user-123')).rejects.toMatchObject({
      statusCode: 400,
      message: 'You have already used this discount code the maximum number of times',
    });
  });

  it('succeeds when user usage count is one below perUserLimit', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ perUserLimit: 3 }));
    mockOrder.count.mockResolvedValue(2);

    const result = await discountService.validateDiscount(VALID_INPUT, 'user-456');

    expect(result.valid).toBe(true);
  });

  it('skips per-user check entirely when userId is not provided', async () => {
    // Even if user had used it many times, without userId the check is bypassed
    mockOrder.count.mockResolvedValue(999);

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(mockOrder.count).not.toHaveBeenCalled();
    expect(result.valid).toBe(true);
  });

  it('queries orders with correct userId, discountCodeId, and excludes CANCELLED status', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ id: 'disc-42', perUserLimit: 5 }));
    mockOrder.count.mockResolvedValue(0);

    await discountService.validateDiscount(VALID_INPUT, 'user-789');

    expect(mockOrder.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-789',
        discountCodeId: 'disc-42',
        status: { not: 'CANCELLED' },
      },
    });
  });
});

// ===========================================================================
// 5. Minimum order value
// ===========================================================================

describe('validateDiscount — minimum order value', () => {
  it('throws with the minimum value in the message when orderTotal is below minOrderValue', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ minOrderValue: '500' }));

    await expect(
      discountService.validateDiscount({ code: 'SAVE10', orderTotal: 499 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Minimum order value is ₹500',
    });
  });

  it('succeeds when orderTotal exactly equals minOrderValue', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ minOrderValue: '500' }));

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 500 });

    expect(result.valid).toBe(true);
  });

  it('succeeds when orderTotal exceeds minOrderValue', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ minOrderValue: '200' }));

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 1000 });

    expect(result.valid).toBe(true);
  });

  it('skips minimum order check when minOrderValue is null', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ minOrderValue: null, type: 'FLAT', value: '50' })
    );

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 1 });

    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// 6. Discount calculation — PERCENTAGE type
// ===========================================================================

describe('validateDiscount — PERCENTAGE calculation', () => {
  it('calculates percentage discount correctly', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'PERCENTAGE', value: '10', maxDiscountAmount: null })
    );

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 1000 });

    expect(result.discountAmount).toBe(100); // 10% of 1000
  });

  it('caps percentage discount at maxDiscountAmount when computed amount exceeds cap', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'PERCENTAGE', value: '20', maxDiscountAmount: '150' })
    );

    // 20% of 1000 = 200, but cap is 150
    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 1000 });

    expect(result.discountAmount).toBe(150);
  });

  it('does not apply cap when computed amount is below maxDiscountAmount', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'PERCENTAGE', value: '10', maxDiscountAmount: '200' })
    );

    // 10% of 1000 = 100, cap is 200 — no cap applied
    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 1000 });

    expect(result.discountAmount).toBe(100);
  });

  it('rounds percentage discount to 2 decimal places', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'PERCENTAGE', value: '10', maxDiscountAmount: null })
    );

    // 10% of 333.33 = 33.333 → rounds to 33.33
    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 333.33 });

    expect(result.discountAmount).toBe(33.33);
  });

  it('returns correct type and value in the response shape', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'PERCENTAGE', value: '15', code: 'FIFTEEN', description: '15% off' })
    );

    const result = await discountService.validateDiscount({ code: 'FIFTEEN', orderTotal: 200 });

    expect(result).toMatchObject({
      valid: true,
      code: 'FIFTEEN',
      type: 'PERCENTAGE',
      value: 15,
      description: '15% off',
    });
  });
});

// ===========================================================================
// 7. Discount calculation — FLAT type
// ===========================================================================

describe('validateDiscount — FLAT calculation', () => {
  it('deducts the flat value when it is less than orderTotal', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ type: 'FLAT', value: '50' }));

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 500 });

    expect(result.discountAmount).toBe(50);
  });

  it('caps flat discount at orderTotal to prevent a negative order total', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ type: 'FLAT', value: '200' }));

    // Flat value (200) > orderTotal (100) → discount capped at 100
    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 100 });

    expect(result.discountAmount).toBe(100);
  });

  it('returns discountAmount equal to orderTotal when flat value exactly equals orderTotal', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ type: 'FLAT', value: '300' }));

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 300 });

    expect(result.discountAmount).toBe(300);
  });

  it('rounds flat discount to 2 decimal places', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(makeDiscount({ type: 'FLAT', value: '33.333' }));

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 1000 });

    expect(result.discountAmount).toBe(33.33);
  });
});

// ===========================================================================
// 8. Discount calculation — FREE_SHIPPING type
// ===========================================================================

describe('validateDiscount — FREE_SHIPPING calculation', () => {
  it('returns discountAmount of 0 for FREE_SHIPPING', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'FREE_SHIPPING', value: '0' })
    );

    const result = await discountService.validateDiscount({ code: 'SAVE10', orderTotal: 999 });

    expect(result.discountAmount).toBe(0);
    expect(result.type).toBe('FREE_SHIPPING');
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// 9. Discount calculation — BUY_X_GET_Y type
// ===========================================================================

describe('validateDiscount — BUY_X_GET_Y calculation', () => {
  it('returns discountAmount of 0 for BUY_X_GET_Y type (silently skipped in v1)', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'BUY_X_GET_Y', value: '1' })
    );

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(result.discountAmount).toBe(0);
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// 10. Discount calculation — unknown type fallthrough
// ===========================================================================

describe('validateDiscount — unknown discount type', () => {
  it('returns discountAmount of 0 for an unrecognised discount type', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'MYSTERY_TYPE', value: '50' })
    );

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(result.discountAmount).toBe(0);
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// 11. Response shape
// ===========================================================================

describe('validateDiscount — response shape', () => {
  it('returns all required fields in the success response', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({
        code: 'FLAT50',
        type: 'FLAT',
        value: '50',
        description: '₹50 flat off',
      })
    );

    const result = await discountService.validateDiscount({ code: 'FLAT50', orderTotal: 500 });

    expect(result).toEqual({
      valid: true,
      code: 'FLAT50',
      type: 'FLAT',
      value: 50,
      discountAmount: 50,
      description: '₹50 flat off',
    });
  });

  it('coerces Prisma Decimal value to a JS number', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ type: 'PERCENTAGE', value: '12.5' })
    );

    const result = await discountService.validateDiscount(VALID_INPUT);

    expect(typeof result.value).toBe('number');
    expect(result.value).toBe(12.5);
  });
});

// ===========================================================================
// 12. Validation ordering — confirm guards fire before calculation
// ===========================================================================

describe('validateDiscount — guard ordering', () => {
  it('rejects inactive code before checking date range', async () => {
    // Code is inactive AND date range is invalid — should throw the inactive error
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({
        isActive: false,
        startsAt: dateOffset(ONE_DAY),
        expiresAt: dateOffset(-ONE_DAY),
      })
    );

    await expect(discountService.validateDiscount(VALID_INPUT)).rejects.toMatchObject({
      message: 'Invalid discount code',
    });
  });

  it('checks global usage limit before per-user limit', async () => {
    // Global limit exhausted — per-user check should never fire
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ usageCount: 50, usageLimit: 50, perUserLimit: 5 })
    );

    await expect(discountService.validateDiscount(VALID_INPUT, 'user-abc')).rejects.toMatchObject({
      message: 'Discount code usage limit reached',
    });

    // order.count should NOT have been called
    expect(mockOrder.count).not.toHaveBeenCalled();
  });

  it('checks minOrderValue before calculating the discount amount', async () => {
    mockDiscountCode.findUnique.mockResolvedValue(
      makeDiscount({ minOrderValue: '1000', type: 'PERCENTAGE', value: '50' })
    );

    await expect(
      discountService.validateDiscount({ code: 'SAVE10', orderTotal: 999 })
    ).rejects.toMatchObject({
      message: 'Minimum order value is ₹1000',
    });
  });
});
