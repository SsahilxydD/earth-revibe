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

// Optional effective date for an offline sale. Lets the admin backdate an
// in-person order that was actually made earlier; stored as Order.createdAt,
// which is what revenue/analytics group by and what the order list sorts on.
// Transported as an ISO-8601 UTC string (what `Date.toISOString()` produces).
// Bounded to "not in the future" — with a 1-day slack for the admin's timezone
// vs. server clock — and a sane lower bound so a typo can't land in 1970.
export const offlineOrderDateSchema = z
  .string()
  .datetime({ message: 'Order date must be a valid date' })
  .refine((s) => Date.parse(s) <= Date.now() + 24 * 60 * 60 * 1000, {
    message: 'Order date cannot be in the future',
  })
  .refine((s) => Date.parse(s) >= Date.parse('2020-01-01T00:00:00.000Z'), {
    message: 'Order date is too far in the past',
  });

export const createManualOrderSchema = z.object({
  // The User row of the verified customer (returned by verify-customer-otp).
  // Required — the customer must be OTP-verified before we'll record the sale.
  // This is what lets the customer see the order when they later log in via OTP.
  userId: z.string().min(1, 'Customer must be verified before creating the order'),
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
  // Optional backdating — when omitted, createdAt defaults to now().
  orderDate: offlineOrderDateSchema.optional(),
});

// ── Offline-order customer verification (admin) ────────────────────
// Two-step OTP gate before the admin can create a manual order. The
// admin enters the customer's phone, we send a WhatsApp OTP, the
// customer reads it out, the admin types it in. On success, the User
// is created or found and its userId becomes the input to
// createManualOrderSchema.

export const sendCustomerOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)'),
});

export const verifyCustomerOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)'),
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  // Optional name fields used to backfill the User on first-time signup
  // (or fill in a User that was created without a name from a prior order).
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
});

// ── Draft offline orders (two-phase) ───────────────────────────────
// For offline sales that aren't paid on the spot. The admin captures a
// temp customer (name + phone, UNVERIFIED) and the cart, and saves a
// DRAFT order — no stock is reserved and it's excluded from revenue /
// counts / customer history. Later, once payment lands, the customer is
// OTP-verified and the draft is confirmed into a real OFFLINE order.

export const createDraftOrderSchema = z.object({
  // Temp customer — captured up front, verified later. Name first, then phone.
  guestName: z.string().trim().min(1, 'Customer name is required').max(120),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)'),
  items: z.array(manualOrderItemSchema).min(1, 'At least one item is required'),
  discountAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  // Tentative payment method; can be changed at confirm time.
  paymentMethod: offlinePaymentMethodSchema.optional(),
  note: z.string().max(1000).optional(),
  // Optional backdating — carries through to the confirmed order's createdAt.
  orderDate: offlineOrderDateSchema.optional(),
});

// Update an existing DRAFT offline order (items / temp customer / totals).
// Drafts hold no stock and are excluded from revenue until confirmed, so they
// can be freely edited before being verified + confirmed. Mirrors createDraftOrderSchema.
export const updateDraftOrderSchema = z.object({
  guestName: z.string().trim().min(1, 'Customer name is required').max(120),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits)'),
  items: z.array(manualOrderItemSchema).min(1, 'At least one item is required'),
  discountAmount: z.coerce.number().min(0).default(0),
  shippingAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  paymentMethod: offlinePaymentMethodSchema.optional(),
  note: z.string().max(1000).optional(),
});

// Verify the temp customer on a DRAFT order via WhatsApp OTP. The phone is
// taken from the order's guestPhone server-side, so it's not in the body.
export const verifyDraftCustomerSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  // Optional override of the name captured at draft time.
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
});

// Confirm a DRAFT into a real OFFLINE order. Requires the customer to already
// be OTP-verified (userId populated). Reserves stock and sets the final status.
export const confirmOfflineOrderSchema = z.object({
  status: z
    .enum([OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED])
    .default(OrderStatus.DELIVERED),
  paymentMethod: offlinePaymentMethodSchema.optional(),
  note: z.string().max(1000).optional(),
  // Optional backdating applied at confirm time — overrides the draft's date.
  orderDate: offlineOrderDateSchema.optional(),
});

// Re-date an already-created OFFLINE order (admin). createdAt is the order's
// effective/sale date — what revenue/analytics bucket by and what the order
// list sorts on. Only offline orders may be re-dated; online orders stay
// pinned to their real checkout/payment time. orderDate is required here (the
// whole point of the call) unlike the optional create/confirm variants.
export const updateOrderDateSchema = z.object({
  orderDate: offlineOrderDateSchema,
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
export type CreateDraftOrderInput = z.infer<typeof createDraftOrderSchema>;
export type UpdateDraftOrderInput = z.infer<typeof updateDraftOrderSchema>;
export type VerifyDraftCustomerInput = z.infer<typeof verifyDraftCustomerSchema>;
export type ConfirmOfflineOrderInput = z.infer<typeof confirmOfflineOrderSchema>;
export type UpdateOrderDateInput = z.infer<typeof updateOrderDateSchema>;
export type ArchiveOrderInput = z.infer<typeof archiveOrderSchema>;
export type SendCustomerOtpInput = z.infer<typeof sendCustomerOtpSchema>;
export type VerifyCustomerOtpInput = z.infer<typeof verifyCustomerOtpSchema>;
