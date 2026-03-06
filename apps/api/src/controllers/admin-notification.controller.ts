import type { Request, Response } from "express";
import { prisma } from "@earth-revibe/db";

interface AdminNotification {
  type: string;
  title: string;
  message: string;
  count: number;
  priority: "high" | "medium";
}

export const adminNotificationController = {
  async getNotifications(_req: Request, res: Response) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      newOrderCount,
      lowStockCount,
      outOfStockCount,
      failedPaymentCount,
      pendingSupportCount,
    ] = await Promise.all([
      // New orders (PLACED or CONFIRMED) in last 24 hours
      (prisma.order as any).count({
        where: {
          status: { in: ["PLACED", "CONFIRMED"] },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      // Low stock variants (stock > 0 and stock < 10)
      (prisma.productVariant as any).count({
        where: {
          stock: { gt: 0, lt: 10 },
        },
      }),
      // Out of stock variants (stock = 0)
      (prisma.productVariant as any).count({
        where: {
          stock: 0,
        },
      }),
      // Failed payments in last 24 hours
      (prisma.payment as any).count({
        where: {
          status: "FAILED",
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      // Pending support tickets (OPEN or IN_PROGRESS)
      (prisma.supportTicket as any).count({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
    ]);

    const notifications: AdminNotification[] = [];

    if (newOrderCount > 0) {
      notifications.push({
        type: "NEW_ORDER",
        title: "New Orders",
        message: `${newOrderCount} new orders need attention`,
        count: newOrderCount,
        priority: "high",
      });
    }

    if (lowStockCount > 0) {
      notifications.push({
        type: "LOW_STOCK",
        title: "Low Stock Alert",
        message: `${lowStockCount} products running low`,
        count: lowStockCount,
        priority: "medium",
      });
    }

    if (outOfStockCount > 0) {
      notifications.push({
        type: "OUT_OF_STOCK",
        title: "Out of Stock",
        message: `${outOfStockCount} products out of stock`,
        count: outOfStockCount,
        priority: "high",
      });
    }

    if (failedPaymentCount > 0) {
      notifications.push({
        type: "FAILED_PAYMENT",
        title: "Failed Payments",
        message: `${failedPaymentCount} payment failures`,
        count: failedPaymentCount,
        priority: "high",
      });
    }

    if (pendingSupportCount > 0) {
      notifications.push({
        type: "PENDING_SUPPORT",
        title: "Support Tickets",
        message: `${pendingSupportCount} tickets need response`,
        count: pendingSupportCount,
        priority: "medium",
      });
    }

    res.json({ success: true, data: notifications });
  },

  async getNotificationCount(_req: Request, res: Response) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [newOrderCount, outOfStockCount, failedPaymentCount] =
      await Promise.all([
        // New orders (PLACED or CONFIRMED) in last 24 hours — high priority
        (prisma.order as any).count({
          where: {
            status: { in: ["PLACED", "CONFIRMED"] },
            createdAt: { gte: twentyFourHoursAgo },
          },
        }),
        // Out of stock variants — high priority
        (prisma.productVariant as any).count({
          where: {
            stock: 0,
          },
        }),
        // Failed payments in last 24 hours — high priority
        (prisma.payment as any).count({
          where: {
            status: "FAILED",
            createdAt: { gte: twentyFourHoursAgo },
          },
        }),
      ]);

    const count = newOrderCount + outOfStockCount + failedPaymentCount;

    res.json({ success: true, data: { count } });
  },
};
