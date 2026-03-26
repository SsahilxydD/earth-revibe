import type { Request, Response } from 'express';
import { supportService } from '../services/support.service';

export const supportController = {
  async createTicket(req: Request, res: Response) {
    const ticket = await supportService.createTicket(req.user!.id, req.body);
    res.status(201).json({ success: true, data: ticket });
  },

  async listMyTickets(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const result = await supportService.listMyTickets(req.user!.id, page, limit, status);
    res.json({ success: true, data: result });
  },

  async getMyTicket(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const ticket = await supportService.getMyTicket(req.user!.id, ticketNumber);
    res.json({ success: true, data: ticket });
  },

  async addMessage(req: Request, res: Response) {
    const ticketNumber = req.params.ticketNumber as string;
    const message = await supportService.addMessage(req.user!.id, ticketNumber, req.body);
    res.status(201).json({ success: true, data: message });
  },
};
