import type { Request, Response } from "express";
import { productService } from "../services/product.service";

export const productController = {
  async listProducts(req: Request, res: Response) {
    const result = await productService.listProducts(req.query as any);
    res.json({ success: true, data: result });
  },

  async getProductBySlug(req: Request, res: Response) {
    const product = await productService.getProductBySlug(req.params.slug);
    res.json({ success: true, data: product });
  },

  async createProduct(req: Request, res: Response) {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  },

  async updateProduct(req: Request, res: Response) {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({ success: true, data: product });
  },

  async deleteProduct(req: Request, res: Response) {
    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: "Product archived successfully" });
  },

  async addProductVariants(req: Request, res: Response) {
    const variants = await productService.addProductVariants(
      req.params.id,
      req.body.variants
    );
    res.status(201).json({ success: true, data: variants });
  },

  async updateProductVariant(req: Request, res: Response) {
    const variant = await productService.updateProductVariant(
      req.params.variantId,
      req.body
    );
    res.json({ success: true, data: variant });
  },

  async deleteProductVariant(req: Request, res: Response) {
    await productService.deleteProductVariant(req.params.variantId);
    res.json({ success: true, message: "Variant deleted successfully" });
  },
};
