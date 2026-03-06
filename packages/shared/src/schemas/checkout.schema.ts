import { z } from "zod";

// Client sends cart items to create a Magic Checkout order
export const magicCheckoutLineItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const createMagicCheckoutSchema = z.object({
  items: z.array(magicCheckoutLineItemSchema).min(1),
  discountCode: z.string().optional(),
  loyaltyPointsToUse: z.coerce.number().int().min(0).default(0),
});

// Razorpay sends this to our shipping info endpoint
export const shippingInfoRequestSchema = z.object({
  order_id: z.string(),
  razorpay_order_id: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().optional(),
  addresses: z.array(z.object({
    id: z.string(),
    zipcode: z.string(),
    state_code: z.string().optional(),
    country: z.string(),
  })),
});

// Razorpay sends this to our get-promotions endpoint
export const getPromotionsRequestSchema = z.object({
  order_id: z.string(),
  contact: z.string().optional(),
  email: z.string().optional(),
});

// Razorpay sends this to our apply-promotion endpoint
export const applyPromotionRequestSchema = z.object({
  order_id: z.string(),
  contact: z.string().optional(),
  email: z.string().optional(),
  code: z.string().min(1),
});

export type CreateMagicCheckoutInput = z.infer<typeof createMagicCheckoutSchema>;
export type ShippingInfoRequest = z.infer<typeof shippingInfoRequestSchema>;
export type GetPromotionsRequest = z.infer<typeof getPromotionsRequestSchema>;
export type ApplyPromotionRequest = z.infer<typeof applyPromotionRequestSchema>;
