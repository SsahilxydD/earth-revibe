import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { ValidateDiscountInput } from "@earth-revibe/shared";

export const discountService = {
  async validateDiscount(data: ValidateDiscountInput) {
    const discount = await prisma.discountCode.findUnique({
      where: { code: data.code },
    });

    if (!discount || !discount.isActive) {
      throw ApiError.badRequest("Invalid discount code");
    }

    const now = new Date();
    if (discount.startsAt > now || discount.expiresAt < now) {
      throw ApiError.badRequest("Discount code has expired");
    }

    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      throw ApiError.badRequest("Discount code usage limit reached");
    }

    if (discount.minOrderValue && data.orderTotal < Number(discount.minOrderValue)) {
      throw ApiError.badRequest(`Minimum order value is ₹${discount.minOrderValue}`);
    }

    // Calculate discount amount
    let discountAmount: number;
    if (discount.type === "PERCENTAGE") {
      discountAmount = data.orderTotal * (Number(discount.value) / 100);
      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
      }
    } else {
      discountAmount = Math.min(Number(discount.value), data.orderTotal);
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
