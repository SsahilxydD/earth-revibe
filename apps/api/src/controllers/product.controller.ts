import type { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { backInStockService } from '../services/back-in-stock.service';

export const productController = {
  async listProducts(req: Request, res: Response) {
    const result = await productService.listProducts(res.locals.validatedQuery || req.query);
    res.json({ success: true, data: result });
  },

  async getProductBySlug(req: Request, res: Response) {
    const product = await productService.getProductBySlug(req.params.slug as string);
    res.json({ success: true, data: product });
  },

  async createProduct(req: Request, res: Response) {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  },

  async updateProduct(req: Request, res: Response) {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    res.json({ success: true, data: product });
  },

  async deleteProduct(req: Request, res: Response) {
    await productService.deleteProduct(req.params.id as string);
    res.json({ success: true, message: 'Product archived successfully' });
  },

  async addProductVariants(req: Request, res: Response) {
    const variants = await productService.addProductVariants(
      req.params.id as string,
      req.body.variants
    );
    res.status(201).json({ success: true, data: variants });
  },

  async updateProductVariant(req: Request, res: Response) {
    const variant = await productService.updateProductVariant(
      req.params.variantId as string,
      req.body
    );
    res.json({ success: true, data: variant });
  },

  async deleteProductVariant(req: Request, res: Response) {
    await productService.deleteProductVariant(req.params.variantId as string);
    res.json({ success: true, message: 'Variant deleted successfully' });
  },

  async addProductImage(req: Request, res: Response) {
    const image = await productService.addProductImage(req.params.id as string, req.body);
    res.status(201).json({ success: true, data: image });
  },

  async deleteProductImage(req: Request, res: Response) {
    await productService.deleteProductImage(req.params.imageId as string);
    res.json({ success: true, message: 'Image deleted successfully' });
  },

  async setProductImagePrimary(req: Request, res: Response) {
    const image = await productService.setProductImagePrimary(req.params.imageId as string);
    res.json({ success: true, data: image });
  },

  async reorderProductImages(req: Request, res: Response) {
    const images = await productService.reorderProductImages(
      req.params.id as string,
      req.body.imageIds
    );
    res.json({ success: true, data: images });
  },

  async subscribeBackInStock(req: Request, res: Response) {
    const variantId = req.params.variantId as string;
    const result = await backInStockService.subscribe(req.user!.id, variantId);
    res.status(201).json({ success: true, data: result });
  },
};
