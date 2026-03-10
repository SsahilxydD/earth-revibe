import { prisma, Prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { CreateTicketInput, CreateTicketMessageInput, TicketQuery } from "@earth-revibe/shared";

function generateTicketNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${code}`;
}

export const supportService = {
  async createTicket(userId: string, data: CreateTicketInput) {
    const ticketNumber = generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: data.subject,
        category: data.category,
        messages: {
          create: {
            userId,
            content: data.description,
            attachment: data.attachment,
          },
        },
      },
      include: {
        messages: { include: { user: { select: { firstName: true, lastName: true, role: true } } } },
      },
    });

    return ticket;
  },

  async listMyTickets(userId: string, page: number = 1, limit: number = 20, status?: string) {
    const where: Prisma.SupportTicketWhereInput = { userId };
    if (status) where.status = status;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getMyTicket(userId: string, ticketNumber: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        messages: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket || ticket.userId !== userId) {
      throw ApiError.notFound("Ticket not found");
    }

    return ticket;
  },

  async addMessage(userId: string, ticketNumber: string, data: CreateTicketMessageInput) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket || ticket.userId !== userId) {
      throw ApiError.notFound("Ticket not found");
    }
    if (ticket.status === "CLOSED") {
      throw ApiError.badRequest("Cannot reply to a closed ticket");
    }

    const statusUpdate = ticket.status === "RESOLVED" ? "OPEN" : undefined;

    const [message] = await Promise.all([
      prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          userId,
          content: data.content,
          attachment: data.attachment,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      }),
      statusUpdate
        ? prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: statusUpdate } })
        : prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } }),
    ]);

    return message;
  },

  async listAllTickets(query: TicketQuery & { search?: string }) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search) {
      where.OR = [
        { ticketNumber: { contains: query.search, mode: "insensitive" } },
        { subject: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const page = query.page || 1;
    const limit = query.limit || 20;
    return { tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getTicket(ticketNumber: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        messages: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ticket) throw ApiError.notFound("Ticket not found");
    return ticket;
  },

  async updateStatus(ticketNumber: string, status: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket) throw ApiError.notFound("Ticket not found");

    return prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: status as any },
    });
  },

  async assignTicket(ticketNumber: string, assignedTo: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket) throw ApiError.notFound("Ticket not found");

    return prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { assignedTo, status: ticket.status === "OPEN" ? "IN_PROGRESS" : undefined },
    });
  },

  async adminReply(userId: string, ticketNumber: string, data: CreateTicketMessageInput) {
    const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!ticket) throw ApiError.notFound("Ticket not found");

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId,
        content: data.content,
        attachment: data.attachment,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    if (ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return message;
  },
};
