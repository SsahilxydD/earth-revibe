import type { Request, Response } from "express";
import { discountService } from "../services/discount.service";

export const discountController = {
  async validateDiscount(req: Request, res: Response) {
    const result = await discountService.validateDiscount(req.body, req.user?.id);
    res.json({ success: true, data: result });
  },
};
