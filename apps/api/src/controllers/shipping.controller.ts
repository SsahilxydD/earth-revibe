import type { Request, Response } from "express";
import { shiprocketService } from "../services/shiprocket.service";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

export const shippingController = {
  /** Customer: get tracking info for their order */
  async getTracking(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, userId: true },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.userId !== req.user!.id) throw ApiError.forbidden("Not your order");

    const tracking = await shiprocketService.getTracking(order.id);
    res.json({ success: true, data: tracking });
  },

  /** Admin: push order to Shiprocket */
  async createShipment(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, shiprocketOrderId: true, status: true },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.shiprocketOrderId) {
      throw ApiError.badRequest("Shiprocket order already created");
    }
    if (order.status !== "CONFIRMED") {
      throw ApiError.badRequest("Order must be confirmed before creating shipment");
    }

    const result = await shiprocketService.createShiprocketOrder(order.id);
    res.json({ success: true, data: result });
  },

  /** Admin: assign AWB (tracking number) */
  async assignAWB(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, awbCode: true },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.awbCode) {
      throw ApiError.badRequest("AWB already assigned");
    }

    const result = await shiprocketService.assignAWB(order.id, req.body.courierCompanyId);
    res.json({ success: true, data: result });
  },

  /** Admin: generate shipping label */
  async generateLabel(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { shiprocketShipmentId: true },
    });

    if (!order?.shiprocketShipmentId) throw ApiError.badRequest("No shipment found");

    const labelUrl = await shiprocketService.generateLabel(order.shiprocketShipmentId);
    res.json({ success: true, data: { labelUrl } });
  },

  /** Admin: generate manifest */
  async generateManifest(req: Request, res: Response) {
    const orderNumber = req.params.orderNumber as string;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { shiprocketShipmentId: true },
    });

    if (!order?.shiprocketShipmentId) throw ApiError.badRequest("No shipment found");

    const manifestUrl = await shiprocketService.generateManifest(order.shiprocketShipmentId);
    res.json({ success: true, data: { manifestUrl } });
  },

  /** Check courier serviceability for a pincode */
  async checkServiceability(req: Request, res: Response) {
    const pincode = req.params.pincode as string;
    const result = await shiprocketService.checkServiceability(pincode);
    res.json({ success: true, data: result });
  },
};
