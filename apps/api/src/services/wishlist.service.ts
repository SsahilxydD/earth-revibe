import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

export const wishlistService = {
  async getWishlist(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return items;
  },

  async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) return existing;

    const item = await prisma.wishlistItem.create({
      data: { userId, productId },
    });
    return item;
  },

  async removeFromWishlist(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  },

  async isInWishlist(userId: string, productId: string) {
    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return !!item;
  },
};
