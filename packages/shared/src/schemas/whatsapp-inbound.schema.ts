import { z } from 'zod';

// CRM inbox: list of inbound WhatsApp messages, paginated, filterable.
// Soft-linked to User via fromWaId → User.phone digit-match.

export const whatsAppInboundQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  // Filter: only show messages from registered users (linkedUser=true)
  // or only from non-users (linkedUser=false). Omit for "both".
  linkedUser: z.enum(['true', 'false']).optional(),
  // Filter: only replies to our outbound templates (messages with a non-null
  // repliedTo — Meta's context.id from the webhook payload).
  repliesOnly: z.enum(['true', 'false']).optional(),
});

export type WhatsAppInboundQuery = z.infer<typeof whatsAppInboundQuerySchema>;

export interface WhatsAppInboundMessageRow {
  id: string;
  messageId: string;
  fromWaId: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  } | null;
  messageType: string;
  text: string | null;
  mediaUrl: string | null;
  repliedTo: string | null;
  receivedAt: string;
}

export interface WhatsAppInboundResponse {
  messages: WhatsAppInboundMessageRow[];
  nextCursor: string | null;
}
