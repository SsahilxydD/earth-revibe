import type { Request, Response } from 'express';
import type { TicketStatus, TicketPriority } from '@earth-revibe/shared';
import { supportService } from '../services/support.service';

export const adminSupportController = {
  async listAll(req: Request, res: Response) {
    const result = await supportService.listAllTickets({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status: req.query.status as TicketStatus | undefined,
      priority: req.query.priority as TicketPriority | undefined,
      search: req.query.search as string | undefined,
    });
    res.json({ success: true, data: result });
  },

  async getTicket(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.getTicket(ticketNumber);
    res.json({ success: true, data: ticket });
  },

  async updateStatus(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.updateStatus(ticketNumber, req.body.status);
    res.json({ success: true, data: ticket });
  },

  async assignTicket(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.assignTicket(ticketNumber, req.body.assignedTo);
    res.json({ success: true, data: ticket });
  },

  async reply(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const message = await supportService.adminReply(req.user!.id, ticketNumber, req.body);
    res.status(201).json({ success: true, data: message });
  },
};
