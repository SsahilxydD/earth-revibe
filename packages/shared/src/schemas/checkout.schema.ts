import { z } from 'zod';

// Client sends cart items to create a Magic Checkout order
export const magicCheckoutLineItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const createMagicCheckoutSchema = z.object({
  items: z.array(magicCheckoutLineItemSchema).min(1),
  discountCode: z.string().optional(),
  loyaltyPointsToUse: z.coerce.number().int().min(0).default(0),
  guestEmail: z.string().email().optional(),
});

// Razorpay server-to-server callback schemas use .passthrough() because
// Razorpay may send additional fields we don't explicitly define.
// Without passthrough, Zod's strict mode strips/rejects unknown fields.

// Razorpay sends this to our shipping info endpoint.
//
// Observed actual payloads:
//   Pre-pincode (country-only, fires when widget opens):
//     { "addresses": [{ "country": "in" }] }
//   Mid-flow (after pincode entered):
//     { "addresses": [{ "line1": "...", "city": "...", "state": "...",
//                       "zipcode": "380009", "country": "in" }] }
//   Some flows send zipcode as a number, not a string.
//
// Everything is permissive on purpose: the ONLY fatal outcome for Magic
// Checkout is a non-200 response — a single 400 can cause Razorpay's
// callback circuit breaker to disable our URL entirely. We accept whatever
// shape Razorpay sends and let the handler decide serviceability.
//
// Coerce numeric zipcode/pincode to string; accept missing fields gracefully.
const addressSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    zipcode: z.union([z.string(), z.number()]).optional(),
    pincode: z.union([z.string(), z.number()]).optional(),
    state_code: z.union([z.string(), z.number()]).optional(),
    country: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const shippingInfoRequestSchema = z
  .object({
    order_id: z.union([z.string(), z.number()]).optional(),
    razorpay_order_id: z.union([z.string(), z.number()]).optional(),
    contact: z.union([z.string(), z.number()]).optional(),
    email: z.string().optional(),
    addresses: z.array(addressSchema).optional().default([]),
  })
  .passthrough();

// Razorpay sends this to our get-promotions endpoint
export const getPromotionsRequestSchema = z
  .object({
    order_id: z.union([z.string(), z.number()]).optional(),
    contact: z.union([z.string(), z.number()]).optional(),
    email: z.string().optional(),
  })
  .passthrough();

// Razorpay sends this to our apply-promotion endpoint
export const applyPromotionRequestSchema = z
  .object({
    order_id: z.union([z.string(), z.number()]).optional(),
    contact: z.union([z.string(), z.number()]).optional(),
    email: z.string().optional(),
    code: z.string().min(1),
  })
  .passthrough();

// COD checkout — requires auth, address ID, no Razorpay
export const createCodOrderSchema = z.object({
  items: z.array(magicCheckoutLineItemSchema).min(1),
  addressId: z.string().min(1),
  discountCode: z.string().optional(),
  loyaltyPointsToUse: z.coerce.number().int().min(0).default(0),
});

export type CreateMagicCheckoutInput = z.infer<typeof createMagicCheckoutSchema>;
export type CreateCodOrderInput = z.infer<typeof createCodOrderSchema>;
export type ShippingInfoRequest = z.infer<typeof shippingInfoRequestSchema>;
export type GetPromotionsRequest = z.infer<typeof getPromotionsRequestSchema>;
export type ApplyPromotionRequest = z.infer<typeof applyPromotionRequestSchema>;
