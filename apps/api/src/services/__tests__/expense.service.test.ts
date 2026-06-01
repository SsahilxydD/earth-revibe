import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindMany,
  mockCount,
  mockAggregate,
  mockGroupBy,
  mockCreate,
  mockFindUnique,
  mockUpdate,
  mockDelete,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockAggregate: vi.fn(),
  mockGroupBy: vi.fn(),
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    operatingExpense: {
      findMany: mockFindMany,
      count: mockCount,
      aggregate: mockAggregate,
      groupBy: mockGroupBy,
      create: mockCreate,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
  Prisma: {},
}));

vi.mock('../../utils/api-error', () => {
  const ApiError = class extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, message: string, code = 'ERROR') {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      Object.setPrototypeOf(this, ApiError.prototype);
    }
    static notFound(message = 'Resource not found') {
      return new ApiError(404, message, 'NOT_FOUND');
    }
    static badRequest(message: string) {
      return new ApiError(400, message, 'BAD_REQUEST');
    }
  };
  return { ApiError };
});

import { expenseService } from '../expense.service';

describe('expenseService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listExpenses', () => {
    it('filters by category + date range and returns a summed totalAmount', async () => {
      mockFindMany.mockResolvedValue([{ id: 'e1', amount: 100 }]);
      mockCount.mockResolvedValue(1);
      mockAggregate.mockResolvedValue({ _sum: { amount: 250 } });

      const res = await expenseService.listExpenses({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        category: 'UTILITIES',
        page: 1,
        limit: 100,
      } as any);

      expect(res.totalAmount).toBe(250);
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.category).toBe('UTILITIES');
      expect(where.incurredAt.gte).toEqual(new Date('2024-01-01'));
      expect(where.incurredAt.lte).toEqual(new Date('2024-01-31'));
    });

    it('omits category/date filters when not provided; 0 total when no rows', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      mockAggregate.mockResolvedValue({ _sum: { amount: null } });

      const res = await expenseService.listExpenses({ page: 1, limit: 100 } as any);

      expect(res.totalAmount).toBe(0);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.category).toBeUndefined();
      expect(where.incurredAt).toBeUndefined();
    });
  });

  describe('createExpense', () => {
    it('stamps the admin id as createdById', async () => {
      mockCreate.mockResolvedValue({ id: 'e1' });

      await expenseService.createExpense('admin-1', {
        label: 'Light bill',
        category: 'UTILITIES',
        amount: 1200,
        incurredAt: new Date('2024-03-01'),
      } as any);

      const data = mockCreate.mock.calls[0][0].data;
      expect(data).toMatchObject({
        label: 'Light bill',
        category: 'UTILITIES',
        amount: 1200,
        createdById: 'admin-1',
      });
    });
  });

  describe('updateExpense', () => {
    it('throws 404 when the expense does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(
        expenseService.updateExpense('missing', { amount: 5 } as any)
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('updates only the provided fields', async () => {
      mockFindUnique.mockResolvedValue({ id: 'e1' });
      mockUpdate.mockResolvedValue({ id: 'e1' });

      await expenseService.updateExpense('e1', { amount: 999 } as any);

      expect(mockUpdate.mock.calls[0][0].data).toEqual({ amount: 999 });
    });
  });

  describe('deleteExpense', () => {
    it('throws 404 when the expense does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(expenseService.deleteExpense('missing')).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes and returns the id when present', async () => {
      mockFindUnique.mockResolvedValue({ id: 'e1' });
      mockDelete.mockResolvedValue({});

      const res = await expenseService.deleteExpense('e1');

      expect(res).toEqual({ id: 'e1' });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
  });
});
