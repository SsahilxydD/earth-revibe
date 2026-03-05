import type { Request, Response } from "express";
import { orderService } from "../services/order.service";

export const orderController = {
  async createOrder(req: Request, res: Response) {
    const result = await orderService.createOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  },

  async verifyPayment(req: Request, res: Response) {
    const result = await orderService.verifyPayment(req.user!.id, req.body);
    res.json({ success: true, data: result });
  },

  async listOrders(req: Request, res: Response) {
    const result = await orderService.listOrders(req.user!.id, req.query as any);
    res.json({ success: true, data: result });
  },

  async getOrder(req: Request, res: Response) {
    const order = await orderService.getOrder(req.user!.id, req.params.orderNumber as string);
    res.json({ success: true, data: order });
  },

  async cancelOrder(req: Request, res: Response) {
    const result = await orderService.cancelOrder(
      req.user!.id,
      req.params.orderNumber as string,
      req.body
    );
    res.json({ success: true, data: result });
  },
};
