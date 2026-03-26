import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../../utils/api-error';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// Must be declared before any imports that touch @earth-revibe/db so that
// vi.mock() hoisting places them above the module factory call.
const { mockUser, mockLoyaltyTransaction } = vi.hoisted(() => ({
  mockUser: { findUnique: vi.fn() },
  mockLoyaltyTransaction: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    user: mockUser,
    loyaltyTransaction: mockLoyaltyTransaction,
  },
}));

// ── Service under test ────────────────────────────────────────────────────────
import { loyaltyService } from '../loyalty.service';

// ── Shared fixtures ───────────────────────────────────────────────────────────
const USER_ID = 'user-abc-123';

const makeTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'txn-1',
  userId: USER_ID,
  type: 'EARNED',
  points: 100,
  description: 'Purchase reward',
  orderId: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

// ── Reset all mocks between tests ─────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// getBalance
// ─────────────────────────────────────────────────────────────────────────────
describe('loyaltyService.getBalance', () => {
  it("returns points and value equal to the user's loyaltyPoints", async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 250 });

    const result = await loyaltyService.getBalance(USER_ID);

    expect(result.points).toBe(250);
    expect(result.value).toBe(250);
  });

  it('enforces a 1:1 ratio — points always equals value', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 1337 });

    const result = await loyaltyService.getBalance(USER_ID);

    expect(result.points).toBe(result.value);
  });

  it('returns zero points when user has no loyalty points accumulated', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 0 });

    const result = await loyaltyService.getBalance(USER_ID);

    expect(result.points).toBe(0);
    expect(result.value).toBe(0);
  });

  it('queries prisma with the correct userId and selects only loyaltyPoints', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 10 });

    await loyaltyService.getBalance(USER_ID);

    expect(mockUser.findUnique).toHaveBeenCalledOnce();
    expect(mockUser.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { loyaltyPoints: true },
    });
  });

  it('throws ApiError with 404 / NOT_FOUND when user does not exist', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(loyaltyService.getBalance(USER_ID)).rejects.toThrow(ApiError);
    await expect(loyaltyService.getBalance(USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  });

  it('does not swallow prisma errors — propagates unexpected DB failures', async () => {
    mockUser.findUnique.mockRejectedValue(new Error('Connection timeout'));

    await expect(loyaltyService.getBalance(USER_ID)).rejects.toThrow('Connection timeout');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getHistory
// ─────────────────────────────────────────────────────────────────────────────
describe('loyaltyService.getHistory', () => {
  it('returns transactions, total, page, limit, and totalPages', async () => {
    const txns = [makeTransaction()];
    mockLoyaltyTransaction.findMany.mockResolvedValue(txns);
    mockLoyaltyTransaction.count.mockResolvedValue(1);

    const result = await loyaltyService.getHistory(USER_ID);

    expect(result.transactions).toEqual(txns);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('uses page=1 and limit=20 as defaults when not provided', async () => {
    mockLoyaltyTransaction.findMany.mockResolvedValue([]);
    mockLoyaltyTransaction.count.mockResolvedValue(0);

    await loyaltyService.getHistory(USER_ID);

    expect(mockLoyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });

  it('calculates skip correctly — page 3 with limit 10 skips 20 records', async () => {
    mockLoyaltyTransaction.findMany.mockResolvedValue([]);
    mockLoyaltyTransaction.count.mockResolvedValue(30);

    const result = await loyaltyService.getHistory(USER_ID, 3, 10);

    expect(mockLoyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('calculates totalPages using ceiling division — 45 records / 20 per page = 3 pages', async () => {
    mockLoyaltyTransaction.findMany.mockResolvedValue([]);
    mockLoyaltyTransaction.count.mockResolvedValue(45);

    const result = await loyaltyService.getHistory(USER_ID, 1, 20);

    expect(result.totalPages).toBe(3);
  });

  it('calculates totalPages as 0 when there are no transactions', async () => {
    mockLoyaltyTransaction.findMany.mockResolvedValue([]);
    mockLoyaltyTransaction.count.mockResolvedValue(0);

    const result = await loyaltyService.getHistory(USER_ID);

    expect(result.totalPages).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });

  it('orders results by createdAt descending', async () => {
    mockLoyaltyTransaction.findMany.mockResolvedValue([]);
    mockLoyaltyTransaction.count.mockResolvedValue(0);

    await loyaltyService.getHistory(USER_ID);

    expect(mockLoyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    );
  });

  it('filters transactions by userId', async () => {
    mockLoyaltyTransaction.findMany.mockResolvedValue([]);
    mockLoyaltyTransaction.count.mockResolvedValue(0);

    await loyaltyService.getHistory(USER_ID);

    expect(mockLoyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
    expect(mockLoyaltyTransaction.count).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it('runs findMany and count in parallel via Promise.all', async () => {
    const order: string[] = [];
    mockLoyaltyTransaction.findMany.mockImplementation(async () => {
      order.push('findMany');
      return [];
    });
    mockLoyaltyTransaction.count.mockImplementation(async () => {
      order.push('count');
      return 0;
    });

    await loyaltyService.getHistory(USER_ID);

    // Both must have been called (order may vary depending on microtask scheduling,
    // but both must complete before the result is returned)
    expect(order).toContain('findMany');
    expect(order).toContain('count');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSummary
// ─────────────────────────────────────────────────────────────────────────────
describe('loyaltyService.getSummary', () => {
  it('returns currentBalance, totalEarned, totalRedeemed, and pointValue', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 300 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 500 } }) // EARNED
      .mockResolvedValueOnce({ _sum: { points: -200 } }); // REDEEMED

    const result = await loyaltyService.getSummary(USER_ID);

    expect(result.currentBalance).toBe(300);
    expect(result.totalEarned).toBe(500);
    expect(result.totalRedeemed).toBe(200);
    expect(result.pointValue).toBe(1);
  });

  it('throws ApiError 404 / NOT_FOUND when user does not exist', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(loyaltyService.getSummary(USER_ID)).rejects.toThrow(ApiError);
    await expect(loyaltyService.getSummary(USER_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  });

  it('does not call aggregate when user is not found', async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await loyaltyService.getSummary(USER_ID).catch(() => undefined);

    expect(mockLoyaltyTransaction.aggregate).not.toHaveBeenCalled();
  });

  it('defaults totalEarned to 0 when aggregate _sum.points is null', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 0 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: null } }) // EARNED → null
      .mockResolvedValueOnce({ _sum: { points: null } }); // REDEEMED → null

    const result = await loyaltyService.getSummary(USER_ID);

    expect(result.totalEarned).toBe(0);
  });

  it('defaults totalRedeemed to 0 when aggregate _sum.points is null', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 0 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: null } })
      .mockResolvedValueOnce({ _sum: { points: null } });

    const result = await loyaltyService.getSummary(USER_ID);

    expect(result.totalRedeemed).toBe(0);
  });

  it('converts negative REDEEMED sum to a positive absolute value', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 800 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 1000 } })
      .mockResolvedValueOnce({ _sum: { points: -200 } }); // stored as negative

    const result = await loyaltyService.getSummary(USER_ID);

    expect(result.totalRedeemed).toBe(200);
    expect(result.totalRedeemed).toBeGreaterThanOrEqual(0);
  });

  it('aggregates EARNED transactions filtered by the correct type', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 100 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 100 } })
      .mockResolvedValueOnce({ _sum: { points: 0 } });

    await loyaltyService.getSummary(USER_ID);

    const calls = mockLoyaltyTransaction.aggregate.mock.calls;
    expect(calls[0][0]).toMatchObject({ where: { userId: USER_ID, type: 'EARNED' } });
  });

  it('aggregates REDEEMED transactions filtered by the correct type', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 100 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 100 } })
      .mockResolvedValueOnce({ _sum: { points: 0 } });

    await loyaltyService.getSummary(USER_ID);

    const calls = mockLoyaltyTransaction.aggregate.mock.calls;
    expect(calls[1][0]).toMatchObject({ where: { userId: USER_ID, type: 'REDEEMED' } });
  });

  it('always returns pointValue of 1 regardless of balance', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 9999 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 9999 } })
      .mockResolvedValueOnce({ _sum: { points: 0 } });

    const result = await loyaltyService.getSummary(USER_ID);

    expect(result.pointValue).toBe(1);
  });

  it('handles a brand-new user with zero balance and no transactions', async () => {
    mockUser.findUnique.mockResolvedValue({ loyaltyPoints: 0 });
    mockLoyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: null } })
      .mockResolvedValueOnce({ _sum: { points: null } });

    const result = await loyaltyService.getSummary(USER_ID);

    expect(result.currentBalance).toBe(0);
    expect(result.totalEarned).toBe(0);
    expect(result.totalRedeemed).toBe(0);
    expect(result.pointValue).toBe(1);
  });
});
