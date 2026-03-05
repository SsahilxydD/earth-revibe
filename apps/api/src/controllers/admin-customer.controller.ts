import type { Request, Response } from "express";
import { adminCustomerService } from "../services/admin-customer.service";

export const adminCustomerController = {
  async listCustomers(req: Request, res: Response) {
    const query = {
      search: req.query.search as string | undefined,
      isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as string) || "desc",
    };
    const result = await adminCustomerService.listCustomers(query);
    res.json({ success: true, ...result });
  },

  async getCustomer(req: Request, res: Response) {
    const id = req.params.id as string;
    const customer = await adminCustomerService.getCustomer(id);
    res.json({ success: true, customer });
  },

  async toggleActive(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminCustomerService.toggleActive(id);
    res.json({ success: true, ...result });
  },
};
