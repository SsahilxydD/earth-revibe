import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// ---------------------------------------------------------------------------
// Mock @earth-revibe/db BEFORE importing the controller so the module sees
// the mock when it resolves the import at test time.
// ---------------------------------------------------------------------------
vi.mock("@earth-revibe/db", () => ({
  prisma: {
    order: { count: vi.fn() },
    productVariant: { count: vi.fn() },
    payment: { count: vi.fn() },
    supportTicket: { count: vi.fn() },
  },
}));

// Import AFTER the mock is registered.
import { adminNotificationController } from "../admin-notification.controller";
import { prisma } from "@earth-revibe/db";

// ---------------------------------------------------------------------------
// Typed aliases so TypeScript knows these are mocked functions.
// ---------------------------------------------------------------------------
const orderCount = prisma.order.count as ReturnType<typeof vi.fn>;
const variantCount = prisma.productVariant.count as ReturnType<typeof vi.fn>;
const paymentCount = prisma.payment.count as ReturnType<typeof vi.fn>;
const ticketCount = prisma.supportTicket.count as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock Express Request (unused by the controller). */
function mockReq(): Request {
  return {} as Request;
}

/** Build a mock Express Response that captures json() calls. */
function mockRes(): { res: Response; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const res = { json } as unknown as Response;
  return { res, json };
}

/**
 * Wire all five prisma mocks used by getNotifications in the order
 * Promise.all resolves them:
 *   1. order.count       -> newOrderCount
 *   2. productVariant.count (gt:0, lt:10) -> lowStockCount
 *   3. productVariant.count (stock:0)     -> outOfStockCount
 *   4. payment.count     -> failedPaymentCount
 *   5. supportTicket.count -> pendingSupportCount
 *
 * productVariant.count is called twice; mockResolvedValueOnce chains correctly.
 */
function setupGetNotificationsMocks(counts: {
  newOrder: number;
  lowStock: number;
  outOfStock: number;
  failedPayment: number;
  pendingSupport: number;
}) {
  orderCount.mockResolvedValueOnce(counts.newOrder);
  variantCount.mockResolvedValueOnce(counts.lowStock);   // first call: low stock
  variantCount.mockResolvedValueOnce(counts.outOfStock); // second call: out-of-stock
  paymentCount.mockResolvedValueOnce(counts.failedPayment);
  ticketCount.mockResolvedValueOnce(counts.pendingSupport);
}

/**
 * Wire the three prisma mocks used by getNotificationCount:
 *   1. order.count        -> newOrderCount
 *   2. productVariant.count (stock:0) -> outOfStockCount
 *   3. payment.count      -> failedPaymentCount
 */
function setupGetNotificationCountMocks(counts: {
  newOrder: number;
  outOfStock: number;
  failedPayment: number;
}) {
  orderCount.mockResolvedValueOnce(counts.newOrder);
  variantCount.mockResolvedValueOnce(counts.outOfStock);
  paymentCount.mockResolvedValueOnce(counts.failedPayment);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("adminNotificationController.getNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path — all counts non-zero
  // -------------------------------------------------------------------------
  describe("when all counts are non-zero", () => {
    it("returns all five notifications in the response", async () => {
      setupGetNotificationsMocks({
        newOrder: 3,
        lowStock: 5,
        outOfStock: 2,
        failedPayment: 1,
        pendingSupport: 7,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      expect(json).toHaveBeenCalledOnce();
      const { success, data } = json.mock.calls[0][0];
      expect(success).toBe(true);
      expect(data).toHaveLength(5);
    });

    it("includes NEW_ORDER notification with correct shape", async () => {
      setupGetNotificationsMocks({
        newOrder: 3,
        lowStock: 5,
        outOfStock: 2,
        failedPayment: 1,
        pendingSupport: 7,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const notification = data.find((n: { type: string }) => n.type === "NEW_ORDER");

      expect(notification).toMatchObject({
        type: "NEW_ORDER",
        title: "New Orders",
        message: "3 new orders need attention",
        count: 3,
        priority: "high",
      });
    });

    it("includes LOW_STOCK notification with correct shape", async () => {
      setupGetNotificationsMocks({
        newOrder: 3,
        lowStock: 5,
        outOfStock: 2,
        failedPayment: 1,
        pendingSupport: 7,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const notification = data.find((n: { type: string }) => n.type === "LOW_STOCK");

      expect(notification).toMatchObject({
        type: "LOW_STOCK",
        title: "Low Stock Alert",
        message: "5 products running low",
        count: 5,
        priority: "medium",
      });
    });

    it("includes OUT_OF_STOCK notification with correct shape", async () => {
      setupGetNotificationsMocks({
        newOrder: 3,
        lowStock: 5,
        outOfStock: 2,
        failedPayment: 1,
        pendingSupport: 7,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const notification = data.find((n: { type: string }) => n.type === "OUT_OF_STOCK");

      expect(notification).toMatchObject({
        type: "OUT_OF_STOCK",
        title: "Out of Stock",
        message: "2 products out of stock",
        count: 2,
        priority: "high",
      });
    });

    it("includes FAILED_PAYMENT notification with correct shape", async () => {
      setupGetNotificationsMocks({
        newOrder: 3,
        lowStock: 5,
        outOfStock: 2,
        failedPayment: 1,
        pendingSupport: 7,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const notification = data.find((n: { type: string }) => n.type === "FAILED_PAYMENT");

      expect(notification).toMatchObject({
        type: "FAILED_PAYMENT",
        title: "Failed Payments",
        message: "1 payment failures",
        count: 1,
        priority: "high",
      });
    });

    it("includes PENDING_SUPPORT notification with correct shape", async () => {
      setupGetNotificationsMocks({
        newOrder: 3,
        lowStock: 5,
        outOfStock: 2,
        failedPayment: 1,
        pendingSupport: 7,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const notification = data.find((n: { type: string }) => n.type === "PENDING_SUPPORT");

      expect(notification).toMatchObject({
        type: "PENDING_SUPPORT",
        title: "Support Tickets",
        message: "7 tickets need response",
        count: 7,
        priority: "medium",
      });
    });
  });

  // -------------------------------------------------------------------------
  // All counts are zero
  // -------------------------------------------------------------------------
  describe("when all counts are zero", () => {
    it("returns an empty notifications array", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { success, data } = json.mock.calls[0][0];
      expect(success).toBe(true);
      expect(data).toHaveLength(0);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Mixed counts — some zero, some non-zero
  // -------------------------------------------------------------------------
  describe("when only some counts are non-zero", () => {
    it("omits notifications for zero counts and includes non-zero ones", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 4,
        failedPayment: 0,
        pendingSupport: 2,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data).toHaveLength(2);

      const types = data.map((n: { type: string }) => n.type);
      expect(types).toContain("OUT_OF_STOCK");
      expect(types).toContain("PENDING_SUPPORT");
      expect(types).not.toContain("NEW_ORDER");
      expect(types).not.toContain("LOW_STOCK");
      expect(types).not.toContain("FAILED_PAYMENT");
    });

    it("returns only NEW_ORDER when only new orders exist", async () => {
      setupGetNotificationsMocks({
        newOrder: 10,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe("NEW_ORDER");
      expect(data[0].count).toBe(10);
    });

    it("returns only LOW_STOCK when only low-stock variants exist", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 6,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe("LOW_STOCK");
    });

    it("returns only FAILED_PAYMENT when only failed payments exist", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 9,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe("FAILED_PAYMENT");
    });
  });

  // -------------------------------------------------------------------------
  // Priority assignment
  // -------------------------------------------------------------------------
  describe("priority assignment", () => {
    it("assigns high priority to NEW_ORDER", async () => {
      setupGetNotificationsMocks({
        newOrder: 1,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].priority).toBe("high");
    });

    it("assigns medium priority to LOW_STOCK", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 3,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].priority).toBe("medium");
    });

    it("assigns high priority to OUT_OF_STOCK", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 2,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].priority).toBe("high");
    });

    it("assigns high priority to FAILED_PAYMENT", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 4,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].priority).toBe("high");
    });

    it("assigns medium priority to PENDING_SUPPORT", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 5,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].priority).toBe("medium");
    });

    it("has exactly three high-priority types (NEW_ORDER, OUT_OF_STOCK, FAILED_PAYMENT)", async () => {
      setupGetNotificationsMocks({
        newOrder: 1,
        lowStock: 1,
        outOfStock: 1,
        failedPayment: 1,
        pendingSupport: 1,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const highPriorityTypes = data
        .filter((n: { priority: string }) => n.priority === "high")
        .map((n: { type: string }) => n.type);

      expect(highPriorityTypes).toHaveLength(3);
      expect(highPriorityTypes).toContain("NEW_ORDER");
      expect(highPriorityTypes).toContain("OUT_OF_STOCK");
      expect(highPriorityTypes).toContain("FAILED_PAYMENT");
    });

    it("has exactly two medium-priority types (LOW_STOCK, PENDING_SUPPORT)", async () => {
      setupGetNotificationsMocks({
        newOrder: 1,
        lowStock: 1,
        outOfStock: 1,
        failedPayment: 1,
        pendingSupport: 1,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      const mediumPriorityTypes = data
        .filter((n: { priority: string }) => n.priority === "medium")
        .map((n: { type: string }) => n.type);

      expect(mediumPriorityTypes).toHaveLength(2);
      expect(mediumPriorityTypes).toContain("LOW_STOCK");
      expect(mediumPriorityTypes).toContain("PENDING_SUPPORT");
    });
  });

  // -------------------------------------------------------------------------
  // Message formatting
  // -------------------------------------------------------------------------
  describe("message formatting", () => {
    it("interpolates the exact count into NEW_ORDER message", async () => {
      setupGetNotificationsMocks({
        newOrder: 42,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].message).toBe("42 new orders need attention");
    });

    it("interpolates the exact count into LOW_STOCK message", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 8,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].message).toBe("8 products running low");
    });

    it("interpolates the exact count into OUT_OF_STOCK message", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 13,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].message).toBe("13 products out of stock");
    });

    it("interpolates the exact count into FAILED_PAYMENT message", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 7,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].message).toBe("7 payment failures");
    });

    it("interpolates the exact count into PENDING_SUPPORT message", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 11,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].message).toBe("11 tickets need response");
    });

    it("reflects large counts accurately (boundary: 10 000)", async () => {
      setupGetNotificationsMocks({
        newOrder: 10000,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const { data } = json.mock.calls[0][0];
      expect(data[0].count).toBe(10000);
      expect(data[0].message).toBe("10000 new orders need attention");
    });
  });

  // -------------------------------------------------------------------------
  // Prisma query correctness
  // -------------------------------------------------------------------------
  describe("prisma query arguments", () => {
    it("queries orders with PLACED and CONFIRMED statuses and 24-hour window", async () => {
      setupGetNotificationsMocks({
        newOrder: 1,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const before = Date.now();
      const { res } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);
      const after = Date.now();

      expect(orderCount).toHaveBeenCalledOnce();
      const [args] = orderCount.mock.calls[0];
      expect(args.where.status).toEqual({ in: ["PLACED", "CONFIRMED"] });

      const gte: Date = args.where.createdAt.gte;
      const windowMs = 24 * 60 * 60 * 1000;
      expect(gte.getTime()).toBeGreaterThanOrEqual(before - windowMs - 50);
      expect(gte.getTime()).toBeLessThanOrEqual(after - windowMs + 50);
    });

    it("queries low-stock variants with stock > 0 and stock < 10", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 1,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      // First productVariant.count call is for low stock
      const firstCall = variantCount.mock.calls[0][0];
      expect(firstCall.where.stock).toEqual({ gt: 0, lt: 10 });
    });

    it("queries out-of-stock variants with stock = 0", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 1,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      // Second productVariant.count call is for out-of-stock
      const secondCall = variantCount.mock.calls[1][0];
      expect(secondCall.where.stock).toBe(0);
    });

    it("queries payments with FAILED status and 24-hour window", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 1,
        pendingSupport: 0,
      });

      const before = Date.now();
      const { res } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);
      const after = Date.now();

      expect(paymentCount).toHaveBeenCalledOnce();
      const [args] = paymentCount.mock.calls[0];
      expect(args.where.status).toBe("FAILED");

      const gte: Date = args.where.createdAt.gte;
      const windowMs = 24 * 60 * 60 * 1000;
      expect(gte.getTime()).toBeGreaterThanOrEqual(before - windowMs - 50);
      expect(gte.getTime()).toBeLessThanOrEqual(after - windowMs + 50);
    });

    it("queries support tickets with OPEN and IN_PROGRESS statuses", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 1,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      expect(ticketCount).toHaveBeenCalledOnce();
      const [args] = ticketCount.mock.calls[0];
      expect(args.where.status).toEqual({ in: ["OPEN", "IN_PROGRESS"] });
    });

    it("runs all five queries in parallel (all prisma mocks called once per invocation)", async () => {
      setupGetNotificationsMocks({
        newOrder: 1,
        lowStock: 1,
        outOfStock: 1,
        failedPayment: 1,
        pendingSupport: 1,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      expect(orderCount).toHaveBeenCalledOnce();
      expect(variantCount).toHaveBeenCalledTimes(2); // low stock + out-of-stock
      expect(paymentCount).toHaveBeenCalledOnce();
      expect(ticketCount).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Response envelope
  // -------------------------------------------------------------------------
  describe("response envelope", () => {
    it("always sets success: true", async () => {
      setupGetNotificationsMocks({
        newOrder: 0,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      expect(json.mock.calls[0][0].success).toBe(true);
    });

    it("wraps notifications in a data property", async () => {
      setupGetNotificationsMocks({
        newOrder: 2,
        lowStock: 0,
        outOfStock: 0,
        failedPayment: 0,
        pendingSupport: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotifications(mockReq(), res);

      const body = json.mock.calls[0][0];
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});

// ===========================================================================
// getNotificationCount
// ===========================================================================

describe("adminNotificationController.getNotificationCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Sum computation
  // -------------------------------------------------------------------------
  describe("count summation", () => {
    it("returns the sum of newOrder + outOfStock + failedPayment", async () => {
      setupGetNotificationCountMocks({
        newOrder: 3,
        outOfStock: 5,
        failedPayment: 2,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0]).toEqual({
        success: true,
        data: { count: 10 },
      });
    });

    it("returns 0 when all counts are zero", async () => {
      setupGetNotificationCountMocks({
        newOrder: 0,
        outOfStock: 0,
        failedPayment: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0].data.count).toBe(0);
    });

    it("returns newOrder count alone when others are zero", async () => {
      setupGetNotificationCountMocks({
        newOrder: 7,
        outOfStock: 0,
        failedPayment: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0].data.count).toBe(7);
    });

    it("returns outOfStock count alone when others are zero", async () => {
      setupGetNotificationCountMocks({
        newOrder: 0,
        outOfStock: 9,
        failedPayment: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0].data.count).toBe(9);
    });

    it("returns failedPayment count alone when others are zero", async () => {
      setupGetNotificationCountMocks({
        newOrder: 0,
        outOfStock: 0,
        failedPayment: 4,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0].data.count).toBe(4);
    });

    it("sums large counts correctly (boundary: 10 000 each)", async () => {
      setupGetNotificationCountMocks({
        newOrder: 10000,
        outOfStock: 10000,
        failedPayment: 10000,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0].data.count).toBe(30000);
    });
  });

  // -------------------------------------------------------------------------
  // Only high-priority sources queried
  // -------------------------------------------------------------------------
  describe("queries only high-priority sources", () => {
    it("does NOT query supportTicket (medium priority)", async () => {
      setupGetNotificationCountMocks({
        newOrder: 1,
        outOfStock: 1,
        failedPayment: 1,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(ticketCount).not.toHaveBeenCalled();
    });

    it("queries exactly three prisma sources", async () => {
      setupGetNotificationCountMocks({
        newOrder: 1,
        outOfStock: 1,
        failedPayment: 1,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(orderCount).toHaveBeenCalledOnce();
      expect(variantCount).toHaveBeenCalledOnce(); // only out-of-stock
      expect(paymentCount).toHaveBeenCalledOnce();
      expect(ticketCount).not.toHaveBeenCalled();
    });

    it("queries out-of-stock variants with stock = 0", async () => {
      setupGetNotificationCountMocks({
        newOrder: 0,
        outOfStock: 1,
        failedPayment: 0,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      const [args] = variantCount.mock.calls[0];
      expect(args.where.stock).toBe(0);
    });

    it("queries orders with PLACED and CONFIRMED statuses", async () => {
      setupGetNotificationCountMocks({
        newOrder: 1,
        outOfStock: 0,
        failedPayment: 0,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      const [args] = orderCount.mock.calls[0];
      expect(args.where.status).toEqual({ in: ["PLACED", "CONFIRMED"] });
    });

    it("queries payments with FAILED status", async () => {
      setupGetNotificationCountMocks({
        newOrder: 0,
        outOfStock: 0,
        failedPayment: 1,
      });

      const { res } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      const [args] = paymentCount.mock.calls[0];
      expect(args.where.status).toBe("FAILED");
    });
  });

  // -------------------------------------------------------------------------
  // Response envelope
  // -------------------------------------------------------------------------
  describe("response envelope", () => {
    it("always sets success: true", async () => {
      setupGetNotificationCountMocks({
        newOrder: 0,
        outOfStock: 0,
        failedPayment: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      expect(json.mock.calls[0][0].success).toBe(true);
    });

    it("wraps count in a data object", async () => {
      setupGetNotificationCountMocks({
        newOrder: 1,
        outOfStock: 0,
        failedPayment: 0,
      });

      const { res, json } = mockRes();
      await adminNotificationController.getNotificationCount(mockReq(), res);

      const body = json.mock.calls[0][0];
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("count");
      expect(typeof body.data.count).toBe("number");
    });
  });
});
