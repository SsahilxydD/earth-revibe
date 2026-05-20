import { z } from 'zod';
import { OrderStatus, OrderSource } from '../enums';

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  discountCode: z.string().optional(),
  loyaltyPointsToUse: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(5).max(500),
});

export const returnRequestSchema = z.object({
  reason: z.string().min(10).max(1000),
});

export const orderQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminOrderQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  source: z.nativeEnum(OrderSource).optional(),
  // Soft-delete view: 'active' (default) hides archived orders, 'archived'
  // shows only archived, 'all' shows everything.
  view: z.enum(['active', 'archived', 'all']).default('active'),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'totalAmount', 'orderNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const addOrderNoteSchema = z.object({
  content: z.string().min(1).max(1000),
  isInternal: z.boolean().default(true),
});

// ── Manual / offline order creation (admin) ────────────────────────
// For in-person / offline sales entered by an admin. No Razorpay
// Payment row is created; the offline payment method is recorded as an
// internal order note. Stock is decremented just like an online order.

export const manualOrderItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(1000),
  // Optional price override (negotiated offline price). Defaults to the
  // variant's current price when omitted.
  unitPrice: z.coerce.number().min(0).optional(),
});

export const offlinePaymentMethodSchema = z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']);

export const createManualOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  items: z.array(manualOrderItemSchema).min(1, 'At least one item is required'),
  discountAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  // Offline sales are typically already fulfilled in person → default DELIVERED.
  status: z
    .enum([OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED])
    .default(OrderStatus.DELIVERED),
  paymentMethod: offlinePaymentMethodSchema.optional(),
  note: z.string().max(1000).optional(),
});

// Archiving (soft-delete). Reason is optional but recorded in status history.
// Tolerates an empty / absent request body (DELETE with no payload).
export const archiveOrderSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional()
  .default({});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ReturnRequestInput = z.infer<typeof returnRequestSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;
export type AddOrderNoteInput = z.infer<typeof addOrderNoteSchema>;
export type ManualOrderItemInput = z.infer<typeof manualOrderItemSchema>;
export type OfflinePaymentMethod = z.infer<typeof offlinePaymentMethodSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
export type ArchiveOrderInput = z.infer<typeof archiveOrderSchema>;
