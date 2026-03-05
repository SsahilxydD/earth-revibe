import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { AddToCartInput, UpdateCartItemInput } from "@earth-revibe/shared";

export const cartService = {
  async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      price: true,
                      images: { where: { isPrimary: true }, take: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return cart;
  },

  async addItem(userId: string, data: AddToCartInput) {
    // Verify variant exists and is in stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: data.variantId },
      include: { product: { select: { status: true } } },
    });

    if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
      throw ApiError.badRequest("Product variant not available");
    }

    if (variant.stock < data.quantity) {
      throw ApiError.badRequest(`Only ${variant.stock} items available`);
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Upsert cart item
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: data.variantId } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + data.quantity;
      if (newQty > variant.stock) {
        throw ApiError.badRequest(`Only ${variant.stock} items available`);
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: data.variantId,
          quantity: data.quantity,
        },
      });
    }

    return this.getCart(userId);
  },

  async updateItem(userId: string, variantId: string, data: UpdateCartItemInput) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw ApiError.notFound("Cart not found");

    const item = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    if (!item) throw ApiError.notFound("Item not in cart");

    // Check stock
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (variant && data.quantity > variant.stock) {
      throw ApiError.badRequest(`Only ${variant.stock} items available`);
    }

    await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: data.quantity },
    });

    return this.getCart(userId);
  },

  async removeItem(userId: string, variantId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw ApiError.notFound("Cart not found");

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, variantId },
    });

    return this.getCart(userId);
  },

  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  },
};
