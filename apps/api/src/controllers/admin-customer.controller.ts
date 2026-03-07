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
    res.json({ success: true, data: result });
  },

  async exportCSV(_req: Request, res: Response) {
    const csv = await adminCustomerService.exportCustomersCSV();
    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${date}.csv"`);
    res.send(csv);
  },

  async getCustomer(req: Request, res: Response) {
    const id = req.params.id as string;
    const customer = await adminCustomerService.getCustomer(id);
    res.json({ success: true, data: customer });
  },

  async toggleActive(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await adminCustomerService.toggleActive(id);
    res.json({ success: true, data: result });
  },
};
