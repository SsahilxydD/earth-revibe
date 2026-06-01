import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseQuery } from '@earth-revibe/shared';

/**
 * Operating expenses (light bill, logistics, rent, …) recorded by admins. These
 * are subtracted from gross profit to compute net profit in the analytics P&L.
 * Each row is a one-off dated entry; `incurredAt` is the date the cost applies
 * to and is what the P&L date-range filter buckets on.
 */
export const expenseService = {
  async listExpenses(query: ExpenseQuery) {
    const { startDate, endDate, category, page, limit } = query;
    const where: Prisma.OperatingExpenseWhereInput = {};
    if (category) where.category = category;
    if (startDate || endDate) {
      const incurredAt: Prisma.DateTimeFilter = {};
      if (startDate) incurredAt.gte = new Date(startDate);
      if (endDate) incurredAt.lte = new Date(endDate);
      where.incurredAt = incurredAt;
    }

    const [expenses, total, sum] = await Promise.all([
      prisma.operatingExpense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { incurredAt: 'desc' },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
      }),
      prisma.operatingExpense.count({ where }),
      prisma.operatingExpense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      expenses,
      total,
      totalAmount: Number(sum._sum.amount || 0),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async createExpense(adminId: string, data: CreateExpenseInput) {
    return prisma.operatingExpense.create({
      data: {
        label: data.label,
        category: data.category,
        amount: data.amount,
        incurredAt: data.incurredAt,
        note: data.note,
        createdById: adminId,
      },
    });
  },

  async updateExpense(id: string, data: UpdateExpenseInput) {
    const existing = await prisma.operatingExpense.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Expense not found');

    return prisma.operatingExpense.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.incurredAt !== undefined ? { incurredAt: data.incurredAt } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
  },

  async deleteExpense(id: string) {
    const existing = await prisma.operatingExpense.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Expense not found');
    await prisma.operatingExpense.delete({ where: { id } });
    return { id };
  },
};
