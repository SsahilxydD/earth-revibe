import type { Request, Response } from 'express';
import { cartService } from '../services/cart.service';

export const cartController = {
  async getCart(req: Request, res: Response) {
    const cart = await cartService.getCart(req.user!.id);
    res.json({ success: true, data: cart });
  },

  async addItem(req: Request, res: Response) {
    const cart = await cartService.addItem(req.user!.id, req.body);
    res.json({ success: true, data: cart });
  },

  async updateItem(req: Request, res: Response) {
    const cart = await cartService.updateItem(
      req.user!.id,
      req.params.variantId as string,
      req.body
    );
    res.json({ success: true, data: cart });
  },

  async removeItem(req: Request, res: Response) {
    const cart = await cartService.removeItem(req.user!.id, req.params.variantId as string);
    res.json({ success: true, data: cart });
  },

  async clearCart(req: Request, res: Response) {
    await cartService.clearCart(req.user!.id);
    res.json({ success: true, message: 'Cart cleared' });
  },

  async syncCart(req: Request, res: Response) {
    const cart = await cartService.syncCart(req.user!.id, req.body);
    res.json({ success: true, data: cart });
  },
};
