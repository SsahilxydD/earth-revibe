import { z } from 'zod';

// CRM template-variants registry. v1 supports the abandoned-cart recovery
// path; new templateKeys land as more send helpers are wired up.

export const TEMPLATE_KEYS = ['ABANDONED_CART_RECOVERY'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const templateVariantSchema = z.object({
  templateKey: z.enum(TEMPLATE_KEYS),
  variantKey: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, 'variantKey must be alphanumeric, _, or -'),
  templateName: z.string().min(1).max(255),
  bodyPreview: z.string().max(2000).optional().nullable(),
  weight: z.number().int().min(0).max(1000).default(1),
  isActive: z.boolean().default(true),
});

export type TemplateVariantInput = z.infer<typeof templateVariantSchema>;

export interface TemplateVariantRow {
  id: string;
  templateKey: TemplateKey;
  variantKey: string;
  templateName: string;
  bodyPreview: string | null;
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /// Per-status counts since the variant was created. Populated by the
  /// dashboard endpoint, not the CRUD endpoints.
  counts?: VariantCounts;
}

export interface VariantCounts {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface TemplateVariantsResponse {
  variants: TemplateVariantRow[];
}
