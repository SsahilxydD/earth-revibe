import type { Request, Response } from "express";
import { wishlistService } from "../services/wishlist.service";

export const wishlistController = {
  async getWishlist(req: Request, res: Response) {
    const items = await wishlistService.getWishlist(req.user!.id);
    res.json({ success: true, data: items });
  },

  async addToWishlist(req: Request, res: Response) {
    const item = await wishlistService.addToWishlist(req.user!.id, req.body.productId);
    res.status(201).json({ success: true, data: item });
  },

  async removeFromWishlist(req: Request, res: Response) {
    const productId = req.params.productId as string;
    await wishlistService.removeFromWishlist(req.user!.id, productId);
    res.json({ success: true, message: "Removed from wishlist" });
  },

  async checkWishlist(req: Request, res: Response) {
    const productId = req.params.productId as string;
    const inWishlist = await wishlistService.isInWishlist(req.user!.id, productId);
    res.json({ success: true, data: { inWishlist } });
  },
};
