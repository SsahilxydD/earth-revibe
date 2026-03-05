import type { Request, Response } from "express";
import { blogService } from "../services/blog.service";

export const adminBlogController = {
  async listAll(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const result = await blogService.listAll(page, limit, status, search);
    res.json({ success: true, ...result });
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const post = await blogService.getById(id);
    res.json({ success: true, post });
  },

  async create(req: Request, res: Response) {
    const post = await blogService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, post });
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const post = await blogService.update(id, req.body);
    res.json({ success: true, post });
  },

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    await blogService.delete(id);
    res.json({ success: true, message: "Post deleted" });
  },

  async listCategories(_req: Request, res: Response) {
    const categories = await blogService.listCategories();
    res.json({ success: true, categories });
  },

  async createCategory(req: Request, res: Response) {
    const category = await blogService.createCategory(req.body);
    res.status(201).json({ success: true, category });
  },

  async deleteCategory(req: Request, res: Response) {
    const id = req.params.id as string;
    await blogService.deleteCategory(id);
    res.json({ success: true, message: "Category deleted" });
  },

  async listTags(_req: Request, res: Response) {
    const tags = await blogService.listTags();
    res.json({ success: true, tags });
  },

  async createTag(req: Request, res: Response) {
    const tag = await blogService.createTag(req.body);
    res.status(201).json({ success: true, tag });
  },

  async deleteTag(req: Request, res: Response) {
    const id = req.params.id as string;
    await blogService.deleteTag(id);
    res.json({ success: true, message: "Tag deleted" });
  },
};
