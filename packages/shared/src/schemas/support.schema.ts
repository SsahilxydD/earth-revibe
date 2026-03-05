import { z } from "zod";
import { TicketStatus, TicketPriority } from "../enums";

export const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  category: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  attachment: z.string().url().optional(),
});

export const createTicketMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  attachment: z.string().url().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export const assignTicketSchema = z.object({
  assignedTo: z.string().min(1),
});

export const ticketQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type TicketQuery = z.infer<typeof ticketQuerySchema>;
