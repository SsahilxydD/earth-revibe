import type { Request, Response } from 'express';
import { adminOrderService } from '../services/admin-order.service';
import { reconcileStaleCheckouts } from '../services/checkout.service';

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

  async syncOrders(_req: Request, res: Response) {
    const result = await reconcileStaleCheckouts();
    res.json({ success: true, data: result });
  },

  async createManualOrder(req: Request, res: Response) {
    const order = await adminOrderService.createManualOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: order });
  },

  async sendCustomerOtp(req: Request, res: Response) {
    const result = await adminOrderService.sendCustomerOtp(req.body);
    res.json({ success: true, data: result });
  },

  async verifyCustomerOtp(req: Request, res: Response) {
    const result = await adminOrderService.verifyCustomerOtp(req.body);
    res.json({ success: true, data: result });
  },

  async createDraftOrder(req: Request, res: Response) {
    const order = await adminOrderService.createDraftOrder(req.user!.id, req.body);
    res.status(201).json({ success: true, data: order });
  },

  async updateDraftOrder(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await adminOrderService.updateDraftOrder(req.user!.id, orderNumber, req.body);
    res.json({ success: true, data: order });
  },

  async sendDraftCustomerOtp(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.sendDraftCustomerOtp(orderNumber);
    res.json({ success: true, data: result });
  },

  async verifyDraftCustomer(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.verifyDraftCustomer(orderNumber, req.body);
    res.json({ success: true, data: result });
  },

  async confirmOfflineOrder(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.confirmOfflineOrder(req.user!.id, orderNumber, req.body);
    res.json({ success: true, data: result });
  },

  async updateOrderDate(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.updateOrderDate(orderNumber, req.user!.id, req.body);
    res.json({ success: true, data: result });
  },

  async archiveOrder(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.archiveOrder(orderNumber, req.user!.id, req.body ?? {});
    res.json({ success: true, data: result });
  },

  async restoreOrder(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const result = await adminOrderService.restoreOrder(orderNumber, req.user!.id);
    res.json({ success: true, data: result });
  },
};
