import type { Request, Response } from "express";
import { prisma, Prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";

export const adminInventoryController = {
  async listInventory(req: Request, res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search as string | undefined;
    const lowStock = req.query.lowStock as string | undefined;
    const sortBy = (req.query.sortBy as string) || "stock_asc";
    const threshold = Number(req.query.threshold) || 10;

    const where: Prisma.ProductVariantWhereInput = {};

    if (search) {
      where.product = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (lowStock === "low") {
      where.stock = { gt: 0, lt: threshold };
    } else if (lowStock === "out") {
      where.stock = 0;
    }

    let orderBy: Prisma.ProductVariantOrderByWithRelationInput;
    switch (sortBy) {
      case "stock_desc":
        orderBy = { stock: "desc" };
        break;
      case "stock_asc":
        orderBy = { stock: "asc" };
        break;
      case "product_name":
        orderBy = { product: { name: "asc" } };
        break;
      case "updated_at":
        orderBy = { updatedAt: "desc" };
        break;
      default:
        orderBy = { stock: "asc" };
    }

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                select: { url: true, altText: true },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productVariant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        variants,
        page,
        limit,
        total,
        totalPages,
      },
    });
  },

  async updateStock(req: Request, res: Response) {
    const variantId = req.params.variantId as string;
    const { stock } = req.body;

    if (stock === undefined || typeof stock !== "number" || stock < 0) {
      throw ApiError.badRequest("Stock must be a non-negative number");
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw ApiError.notFound("Product variant not found");
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  },

  async adjustStock(req: Request, res: Response) {
    const variantId = req.params.variantId as string;
    const { adjustment, reason } = req.body;

    if (adjustment === undefined || typeof adjustment !== "number" || adjustment === 0) {
      throw ApiError.badRequest("Adjustment must be a non-zero number");
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw ApiError.badRequest("Reason is required for stock adjustment");
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw ApiError.notFound("Product variant not found");
    }

    const newStock = variant.stock + adjustment;
    if (newStock < 0) {
      throw ApiError.badRequest(
        `Cannot adjust stock by ${adjustment}. Current stock is ${variant.stock}`
      );
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        variant: updated,
        adjustment,
        reason,
        previousStock: variant.stock,
        newStock,
      },
    });
  },

  async bulkUpdateStock(req: Request, res: Response) {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw ApiError.badRequest("Updates array is required and must not be empty");
    }

    for (const update of updates) {
      if (!update.variantId || typeof update.stock !== "number" || update.stock < 0) {
        throw ApiError.badRequest(
          "Each update must have a valid variantId and a non-negative stock number"
        );
      }
    }

    const results = await prisma.$transaction(
      updates.map((update: { variantId: string; stock: number }) =>
        prisma.productVariant.update({
          where: { id: update.variantId },
          data: { stock: update.stock },
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        })
      )
    );

    res.json({
      success: true,
      data: {
        results,
        updatedCount: results.length,
      },
    });
  },

  async getInventorySummary(_req: Request, res: Response) {
    const [totalProducts, totalVariants, stockAgg, lowStockCount, outOfStockCount] =
      await Promise.all([
        prisma.product.count(),
        prisma.productVariant.count(),
        prisma.productVariant.aggregate({
          _sum: { stock: true },
        }),
        prisma.productVariant.count({
          where: { stock: { gt: 0, lt: 10 } },
        }),
        prisma.productVariant.count({
          where: { stock: 0 },
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalVariants,
        totalStock: stockAgg._sum.stock || 0,
        lowStockCount,
        outOfStockCount,
      },
    });
  },
};
