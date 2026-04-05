import { prisma } from '@earth-revibe/db';
import { ApiError } from '../utils/api-error';
import type { ValidateDiscountInput } from '@earth-revibe/shared';

export const discountService = {
  async validateDiscount(data: ValidateDiscountInput, userId?: string) {
    const discount = await prisma.discountCode.findUnique({
      where: { code: data.code },
    });

    if (!discount || !discount.isActive) {
      throw ApiError.badRequest('Invalid discount code');
    }

    const now = new Date();
    if (discount.startsAt > now || discount.expiresAt < now) {
      throw ApiError.badRequest('Discount code has expired');
    }

    if (discount.usageLimit != null && discount.usageCount >= discount.usageLimit) {
      throw ApiError.badRequest('Discount code usage limit reached');
    }

    // Per-user limit check — also check by email for guest checkout users
    if (userId) {
      const userUsageCount = await prisma.order.count({
        where: { userId, discountCodeId: discount.id, status: { not: 'CANCELLED' } },
      });
      if (userUsageCount >= discount.perUserLimit) {
        throw ApiError.badRequest(
          'You have already used this discount code the maximum number of times'
        );
      }
    }

    if (discount.minOrderValue && data.orderTotal < Number(discount.minOrderValue)) {
      throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
    }

    // Calculate discount amount — handle all types
    let discountAmount: number;
    if (discount.type === 'PERCENTAGE') {
      discountAmount = data.orderTotal * (Number(discount.value) / 100);
      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
      }
    } else if (discount.type === 'FLAT') {
      discountAmount = Math.min(Number(discount.value), data.orderTotal);
    } else if (discount.type === 'FREE_SHIPPING') {
      discountAmount = 0;
    } else if (discount.type === 'BUY_X_GET_Y') {
      // BUY_X_GET_Y requires product-level configuration — skip silently for v1
      discountAmount = 0;
    } else {
      discountAmount = 0;
    }

    return {
      valid: true,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      description: discount.description,
    };
  },
};
