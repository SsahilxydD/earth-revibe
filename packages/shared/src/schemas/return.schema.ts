import { z } from 'zod';
import { ReturnStatus, ReturnType, ReturnReason } from '../enums';

// A single line a customer wants to return: which order item + how many units.
export const returnItemInputSchema = z.object({
  orderItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

// Customer request to return/exchange items of a delivered order.
// EXCHANGE is constrained to a single line + a chosen replacement variant (the
// automated swap ships exactly one replacement); REFUND can span many lines.
export const createReturnRequestSchema = z
  .object({
    items: z.array(returnItemInputSchema).min(1, 'Select at least one item to return'),
    type: z.nativeEnum(ReturnType),
    reasonCode: z.nativeEnum(ReturnReason),
    comment: z.string().max(1000).optional(),
    // Only for EXCHANGE — the variant the customer wants instead.
    exchangeVariantId: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === ReturnType.EXCHANGE) {
      if (val.items.length !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['items'],
          message: 'An exchange must be for exactly one item',
        });
      }
      if (!val.exchangeVariantId) {
        ctx.addIssue({
          code: 'custom',
          path: ['exchangeVariantId'],
          message: 'Select a replacement size/colour for the exchange',
        });
      }
    } else if (val.exchangeVariantId) {
      ctx.addIssue({
        code: 'custom',
        path: ['exchangeVariantId'],
        message: 'A refund cannot specify a replacement variant',
      });
    }
  });

// Admin transition of a return's status (approve / reject / mark-picked-up /
// mark-received / etc.).
export const updateReturnStatusSchema = z.object({
  status: z.nativeEnum(ReturnStatus),
  adminNote: z.string().max(1000).optional(),
  // On RECEIVED, whether to put the returned stock back on the shelf. When
  // omitted the server decides from the reason code (defective → no restock).
  restock: z.boolean().optional(),
});

// Admin returns-list filters (mirrors adminOrderQuerySchema).
export const returnQuerySchema = z.object({
  status: z.nativeEnum(ReturnStatus).optional(),
  type: z.nativeEnum(ReturnType).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReturnItemInput = z.infer<typeof returnItemInputSchema>;
export type CreateReturnRequestInput = z.infer<typeof createReturnRequestSchema>;
export type UpdateReturnStatusInput = z.infer<typeof updateReturnStatusSchema>;
export type ReturnQuery = z.infer<typeof returnQuerySchema>;
