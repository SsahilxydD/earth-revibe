import type { Request, Response } from "express";
import { adminOrderService } from "../services/admin-order.service";

export const adminOrderController = {
  async listOrders(req: Request, res: Response) {
    const result = await adminOrderService.listOrders(res.locals.validatedQuery || req.query);
    res.json({ success: true, data: result });
  },

  async getOrder(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await adminOrderService.getOrder(orderNumber);
    res.json({ success: true, data: order });
  },

  async updateStatus(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.updateStatus(orderNumber, req.user!.id, req.body);
    res.json({ success: true, data: result });
  },

  async addNote(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const note = await adminOrderService.addNote(orderNumber, req.user!.id, req.body);
    res.json({ success: true, data: note });
  },
};
