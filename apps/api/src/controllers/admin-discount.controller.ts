import type { Request, Response } from 'express';
import { prisma, Prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';

export const adminDiscountController = {
  async listDiscounts(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const isActive = req.query.isActive as string | undefined;
    const type = req.query.type as string | undefined;

    const where: Prisma.DiscountCodeWhereInput = {};

    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;
    if (type) where.type = type as Prisma.EnumDiscountTypeFilter;

    const [discounts, total] = await Promise.all([
      prisma.discountCode.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.discountCode.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        discounts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  },

  async getDiscount(req: Request, res: Response) {
    const id = req.params.id as string;
    const discount = await prisma.discountCode.findUnique({ where: { id } });
    if (!discount) throw ApiError.notFound('Discount code not found');
    res.json({ success: true, data: discount });
  },

  async createDiscount(req: Request, res: Response) {
    const {
      code,
      description,
      type,
      value,
      minOrderValue,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
      applicableProducts,
      applicableCategories,
      startsAt,
      expiresAt,
    } = req.body;

    if (type === 'PERCENTAGE' && Number(value) > 100) {
      throw ApiError.badRequest('Percentage discount cannot exceed 100%');
    }

    const existing = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) throw ApiError.conflict('Discount code already exists');

    const discount = await prisma.discountCode.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        type,
        value,
        minOrderValue: minOrderValue != null ? minOrderValue : null,
        maxDiscountAmount: maxDiscountAmount != null ? maxDiscountAmount : null,
        usageLimit: usageLimit != null ? usageLimit : null,
        perUserLimit: perUserLimit != null ? perUserLimit : 1,
        applicableProducts: applicableProducts || [],
        applicableCategories: applicableCategories || [],
        startsAt: new Date(startsAt),
        expiresAt: new Date(expiresAt),
      },
    });

    res.status(201).json({ success: true, data: discount });
  },

  async updateDiscount(req: Request, res: Response) {
    const id = req.params.id as string;

    const existing = await prisma.discountCode.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Discount code not found');

    const {
      code,
      description,
      type,
      value,
      minOrderValue,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
      applicableProducts,
      applicableCategories,
      startsAt,
      expiresAt,
    } = req.body;

    const effectiveType = type !== undefined ? type : existing.type;
    const effectiveValue = value !== undefined ? value : existing.value;
    if (effectiveType === 'PERCENTAGE' && Number(effectiveValue) > 100) {
      throw ApiError.badRequest('Percentage discount cannot exceed 100%');
    }

    // Check for code uniqueness if code is being changed
    if (code && code.toUpperCase() !== existing.code) {
      const duplicate = await prisma.discountCode.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (duplicate) throw ApiError.conflict('Discount code already exists');
    }

    const discount = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(description !== undefined && { description: description || null }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(minOrderValue !== undefined && {
          minOrderValue: minOrderValue != null ? minOrderValue : null,
        }),
        ...(maxDiscountAmount !== undefined && {
          maxDiscountAmount: maxDiscountAmount != null ? maxDiscountAmount : null,
        }),
        ...(usageLimit !== undefined && { usageLimit: usageLimit != null ? usageLimit : null }),
        ...(perUserLimit !== undefined && {
          perUserLimit: perUserLimit != null ? perUserLimit : 1,
        }),
        ...(applicableProducts !== undefined && { applicableProducts }),
        ...(applicableCategories !== undefined && { applicableCategories }),
        ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
        ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
      },
    });

    res.json({ success: true, data: discount });
  },

  async deleteDiscount(req: Request, res: Response) {
    const id = req.params.id as string;

    const existing = await prisma.discountCode.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Discount code not found');

    try {
      await prisma.discountCode.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw ApiError.conflict(
          'Cannot delete this discount code — it has been used in orders. Deactivate it instead.'
        );
      }
      throw err;
    }
    res.json({ success: true, message: 'Discount code deleted' });
  },

  async toggleActive(req: Request, res: Response) {
    const id = req.params.id as string;

    const discount = await prisma.discountCode.findUnique({ where: { id } });
    if (!discount) throw ApiError.notFound('Discount code not found');

    const updated = await prisma.discountCode.update({
      where: { id },
      data: { isActive: !discount.isActive },
    });

    res.json({ success: true, data: updated });
  },
};
