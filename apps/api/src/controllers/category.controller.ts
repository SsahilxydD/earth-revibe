import type { Request, Response } from "express";
import { categoryService } from "../services/category.service";

export const categoryController = {
  async listCategories(_req: Request, res: Response) {
    const categories = await categoryService.listCategories();
    res.json({ success: true, data: categories });
  },

  async getCategoryBySlug(req: Request, res: Response) {
    const category = await categoryService.getCategoryBySlug(req.params.slug as string);
    res.json({ success: true, data: category });
  },

  async createCategory(req: Request, res: Response) {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  },

  async updateCategory(req: Request, res: Response) {
    const category = await categoryService.updateCategory(req.params.id as string, req.body);
    res.json({ success: true, data: category });
  },

  async deleteCategory(req: Request, res: Response) {
    await categoryService.deleteCategory(req.params.id as string);
    res.json({ success: true, message: "Category deleted successfully" });
  },

  async reorderCategories(req: Request, res: Response) {
    await categoryService.reorderCategories(req.body);
    res.json({ success: true, message: "Categories reordered successfully" });
  },
};
