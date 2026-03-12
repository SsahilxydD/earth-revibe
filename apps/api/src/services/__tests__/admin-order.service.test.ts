import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that references the mocked module
// ---------------------------------------------------------------------------

const {
  mockOrderFindMany,
  mockOrderCount,
  mockOrderFindUnique,
  mockOrderUpdate,
  mockOrderStatusHistoryCreate,
  mockOrderNoteCreate,
} = vi.hoisted(() => ({
  mockOrderFindMany: vi.fn(),
  mockOrderCount: vi.fn(),
  mockOrderFindUnique: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockOrderStatusHistoryCreate: vi.fn(),
  mockOrderNoteCreate: vi.fn(),
}));

vi.mock("@earth-revibe/db", () => ({
  prisma: {
    order: {
      findMany: mockOrderFindMany,
      count: mockOrderCount,
      findUnique: mockOrderFindUnique,
      update: mockOrderUpdate,
    },
    orderStatusHistory: {
      create: mockOrderStatusHistoryCreate,
    },
    orderNote: {
      create: mockOrderNoteCreate,
    },
  },
  Prisma: {},
}));

vi.mock("../../utils/api-error", () => {
  const ApiError = class extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, message: string, code = "ERROR") {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      Object.setPrototypeOf(this, ApiError.prototype);
    }
    static notFound(message = "Resource not found") {
      return new ApiError(404, message, "NOT_FOUND");
    }
    static badRequest(message: string) {
      return new ApiError(400, message, "BAD_REQUEST");
    }
  };
  return { ApiError };
});

// ---------------------------------------------------------------------------
// Subject under test — imported after mocks are registered
// ---------------------------------------------------------------------------

import { adminOrderService } from "../admin-order.service";
import type { AdminOrderQuery, UpdateOrderStatusInput, AddOrderNoteInput } from "@earth-revibe/shared";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_QUERY: AdminOrderQuery = {
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
};

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-id-1",
    orderNumber: "ORD-001",
    status: "PLACED",
    totalAmount: 999,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    guestEmail: null,
    user: { id: "user-1", firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
    items: [{ id: "item-1", productId: "prod-1", quantity: 2, price: 499 }],
    payment: { status: "PAID", method: "CARD", paidAt: new Date() },
    address: { id: "addr-1", line1: "123 Main St", city: "Mumbai" },
    statusHistory: [],
    notes: [],
    discountCode: null,
    ...overrides,
  };
}

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-id-1",
    orderId: "order-id-1",
    userId: "admin-id-1",
    content: "Checked and confirmed",
    isInternal: true,
    createdAt: new Date(),
    user: { firstName: "Admin", lastName: "User" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("adminOrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // listOrders
  // -------------------------------------------------------------------------

  describe("listOrders", () => {
    it("returns orders with pagination metadata on a basic query", async () => {
      const orders = [makeOrder()];
      mockOrderFindMany.mockResolvedValue(orders);
      mockOrderCount.mockResolvedValue(1);

      const result = await adminOrderService.listOrders(BASE_QUERY);

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it("runs findMany and count in parallel via Promise.all", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      // Both mocks must have been called exactly once
      expect(mockOrderFindMany).toHaveBeenCalledTimes(1);
      expect(mockOrderCount).toHaveBeenCalledTimes(1);
    });

    it("passes the correct skip and take for page 2 with limit 10", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(25);

      const query: AdminOrderQuery = { ...BASE_QUERY, page: 2, limit: 10 };
      const result = await adminOrderService.listOrders(query);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
      expect(result.totalPages).toBe(3);
    });

    it("applies status filter to both findMany and count", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, status: "PLACED" as any };
      await adminOrderService.listOrders(query);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PLACED" }) })
      );
      expect(mockOrderCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: "PLACED" }) })
      );
    });

    it("builds OR clause for search term covering all searchable fields", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, search: "alice" };
      await adminOrderService.listOrders(query);

      const [call] = mockOrderFindMany.mock.calls;
      const where = call[0].where;

      expect(where.OR).toHaveLength(5);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { orderNumber: { contains: "alice", mode: "insensitive" } },
          { guestEmail: { contains: "alice", mode: "insensitive" } },
          { user: { email: { contains: "alice", mode: "insensitive" } } },
          { user: { firstName: { contains: "alice", mode: "insensitive" } } },
          { user: { lastName: { contains: "alice", mode: "insensitive" } } },
        ])
      );
    });

    it("does not add OR clause when search is omitted", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    it("applies startDate as createdAt.gte filter", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, startDate: "2024-01-01" };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date("2024-01-01"));
      expect(where.createdAt.lte).toBeUndefined();
    });

    it("applies endDate as createdAt.lte filter", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, endDate: "2024-03-31" };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt.lte).toEqual(new Date("2024-03-31"));
      expect(where.createdAt.gte).toBeUndefined();
    });

    it("applies both startDate and endDate together", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = {
        ...BASE_QUERY,
        startDate: "2024-01-01",
        endDate: "2024-03-31",
      };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt.gte).toEqual(new Date("2024-01-01"));
      expect(where.createdAt.lte).toEqual(new Date("2024-03-31"));
    });

    it("does not add createdAt filter when neither date is provided", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.createdAt).toBeUndefined();
    });

    it("passes sortBy and sortOrder to orderBy", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = { ...BASE_QUERY, sortBy: "totalAmount", sortOrder: "asc" };
      await adminOrderService.listOrders(query);

      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { totalAmount: "asc" } })
      );
    });

    it("includes user, items and payment in findMany select", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      await adminOrderService.listOrders(BASE_QUERY);

      const [call] = mockOrderFindMany.mock.calls;
      expect(call[0].include).toHaveProperty("user");
      expect(call[0].include).toHaveProperty("items");
      expect(call[0].include).toHaveProperty("payment");
    });

    it("returns totalPages=0 when total is 0", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const result = await adminOrderService.listOrders(BASE_QUERY);

      expect(result.totalPages).toBe(0);
    });

    it("calculates totalPages correctly when count does not divide evenly", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(21);

      const query: AdminOrderQuery = { ...BASE_QUERY, limit: 20 };
      const result = await adminOrderService.listOrders(query);

      expect(result.totalPages).toBe(2);
    });

    it("can combine status, search, and date filters simultaneously", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockResolvedValue(0);

      const query: AdminOrderQuery = {
        ...BASE_QUERY,
        status: "SHIPPED" as any,
        search: "bob",
        startDate: "2024-06-01",
        endDate: "2024-06-30",
      };
      await adminOrderService.listOrders(query);

      const where = mockOrderFindMany.mock.calls[0][0].where;
      expect(where.status).toBe("SHIPPED");
      expect(where.OR).toBeDefined();
      expect(where.createdAt.gte).toEqual(new Date("2024-06-01"));
      expect(where.createdAt.lte).toEqual(new Date("2024-06-30"));
    });

    it("propagates database errors from findMany", async () => {
      mockOrderFindMany.mockRejectedValue(new Error("DB connection lost"));
      mockOrderCount.mockResolvedValue(0);

      await expect(adminOrderService.listOrders(BASE_QUERY)).rejects.toThrow("DB connection lost");
    });

    it("propagates database errors from count", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount.mockRejectedValue(new Error("Count query failed"));

      await expect(adminOrderService.listOrders(BASE_QUERY)).rejects.toThrow("Count query failed");
    });
  });

  // -------------------------------------------------------------------------
  // getOrder
  // -------------------------------------------------------------------------

  describe("getOrder", () => {
    it("returns the order when found", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);

      const result = await adminOrderService.getOrder("ORD-001");

      expect(result).toEqual(order);
    });

    it("calls findUnique with orderNumber as the lookup key", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);

      await adminOrderService.getOrder("ORD-001");

      expect(mockOrderFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderNumber: "ORD-001" } })
      );
    });

    it("includes all relations needed for detail view", async () => {
      mockOrderFindUnique.mockResolvedValue(makeOrder());

      await adminOrderService.getOrder("ORD-001");

      const [call] = mockOrderFindUnique.mock.calls;
      expect(call[0].include).toHaveProperty("user");
      expect(call[0].include).toHaveProperty("items");
      expect(call[0].include).toHaveProperty("payment");
      expect(call[0].include).toHaveProperty("address");
      expect(call[0].include).toHaveProperty("statusHistory");
      expect(call[0].include).toHaveProperty("notes");
      expect(call[0].include).toHaveProperty("discountCode");
    });

    it("throws ApiError with 404 when order is not found", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(adminOrderService.getOrder("ORD-NONEXISTENT")).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Order not found",
      });
    });

    it("propagates unexpected database errors", async () => {
      mockOrderFindUnique.mockRejectedValue(new Error("Unexpected DB error"));

      await expect(adminOrderService.getOrder("ORD-001")).rejects.toThrow("Unexpected DB error");
    });
  });

  // -------------------------------------------------------------------------
  // updateStatus — state machine
  // -------------------------------------------------------------------------

  describe("updateStatus", () => {
    const ADMIN_ID = "admin-id-1";

    async function performUpdate(fromStatus: string, toStatus: string, note?: string) {
      const order = makeOrder({ status: fromStatus });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({ ...order, status: toStatus });
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      const data: UpdateOrderStatusInput = { status: toStatus as any, note };
      return adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, data);
    }

    // --- Happy path: all valid transitions ----------------------------------

    it("transitions PLACED -> CONFIRMED", async () => {
      const result = await performUpdate("PLACED", "CONFIRMED");
      expect(result.status).toBe("CONFIRMED");
    });

    it("transitions PLACED -> CANCELLED", async () => {
      const result = await performUpdate("PLACED", "CANCELLED");
      expect(result.status).toBe("CANCELLED");
    });

    it("transitions CONFIRMED -> PROCESSING", async () => {
      const result = await performUpdate("CONFIRMED", "PROCESSING");
      expect(result.status).toBe("PROCESSING");
    });

    it("transitions CONFIRMED -> CANCELLED", async () => {
      const result = await performUpdate("CONFIRMED", "CANCELLED");
      expect(result.status).toBe("CANCELLED");
    });

    it("transitions PROCESSING -> SHIPPED", async () => {
      const result = await performUpdate("PROCESSING", "SHIPPED");
      expect(result.status).toBe("SHIPPED");
    });

    it("transitions PROCESSING -> CANCELLED", async () => {
      const result = await performUpdate("PROCESSING", "CANCELLED");
      expect(result.status).toBe("CANCELLED");
    });

    it("transitions SHIPPED -> OUT_FOR_DELIVERY", async () => {
      const result = await performUpdate("SHIPPED", "OUT_FOR_DELIVERY");
      expect(result.status).toBe("OUT_FOR_DELIVERY");
    });

    it("transitions SHIPPED -> DELIVERED", async () => {
      const result = await performUpdate("SHIPPED", "DELIVERED");
      expect(result.status).toBe("DELIVERED");
    });

    it("transitions OUT_FOR_DELIVERY -> DELIVERED", async () => {
      const result = await performUpdate("OUT_FOR_DELIVERY", "DELIVERED");
      expect(result.status).toBe("DELIVERED");
    });

    it("transitions DELIVERED -> RETURNED", async () => {
      const result = await performUpdate("DELIVERED", "RETURNED");
      expect(result.status).toBe("RETURNED");
    });

    it("transitions DELIVERED -> REFUNDED", async () => {
      const result = await performUpdate("DELIVERED", "REFUNDED");
      expect(result.status).toBe("REFUNDED");
    });

    it("transitions RETURNED -> REFUNDED", async () => {
      const result = await performUpdate("RETURNED", "REFUNDED");
      expect(result.status).toBe("REFUNDED");
    });

    // --- Invalid transitions ------------------------------------------------

    const invalidTransitions: Array<[string, string]> = [
      ["PLACED", "PROCESSING"],
      ["PLACED", "SHIPPED"],
      ["PLACED", "DELIVERED"],
      ["PLACED", "RETURNED"],
      ["PLACED", "REFUNDED"],
      ["CONFIRMED", "PLACED"],
      ["CONFIRMED", "SHIPPED"],
      ["CONFIRMED", "DELIVERED"],
      ["PROCESSING", "PLACED"],
      ["PROCESSING", "CONFIRMED"],
      ["PROCESSING", "DELIVERED"],
      ["SHIPPED", "PLACED"],
      ["SHIPPED", "CONFIRMED"],
      ["SHIPPED", "CANCELLED"],
      ["OUT_FOR_DELIVERY", "SHIPPED"],
      ["OUT_FOR_DELIVERY", "RETURNED"],
      ["OUT_FOR_DELIVERY", "REFUNDED"],
      ["DELIVERED", "PLACED"],
      ["DELIVERED", "CANCELLED"],
      ["CANCELLED", "PLACED"],
      ["CANCELLED", "CONFIRMED"],
      ["CANCELLED", "PROCESSING"],
      ["CANCELLED", "SHIPPED"],
      ["CANCELLED", "DELIVERED"],
      ["CANCELLED", "RETURNED"],
      ["CANCELLED", "REFUNDED"],
      ["RETURNED", "PLACED"],
      ["RETURNED", "CANCELLED"],
      ["REFUNDED", "PLACED"],
      ["REFUNDED", "RETURNED"],
    ];

    it.each(invalidTransitions)(
      "throws 400 BAD_REQUEST for invalid transition %s -> %s",
      async (fromStatus, toStatus) => {
        const order = makeOrder({ status: fromStatus });
        mockOrderFindUnique.mockResolvedValue(order);

        const data: UpdateOrderStatusInput = { status: toStatus as any };
        await expect(
          adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, data)
        ).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

        // No DB mutation should happen on invalid transitions
        expect(mockOrderUpdate).not.toHaveBeenCalled();
        expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();

        vi.clearAllMocks();
      }
    );

    // Terminal states — CANCELLED, REFUNDED have no allowed targets
    it("throws 400 for any transition from CANCELLED and mentions 'none'", async () => {
      const order = makeOrder({ status: "CANCELLED" });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: "PLACED" as any })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("none"),
      });
    });

    it("throws 400 for any transition from REFUNDED and mentions 'none'", async () => {
      const order = makeOrder({ status: "REFUNDED" });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: "RETURNED" as any })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("none"),
      });
    });

    // --- Persistence checks -------------------------------------------------

    it("updates the order status in the database", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: "CONFIRMED" as any,
      });

      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      });
    });

    it("creates an OrderStatusHistory entry with the admin id", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: "CONFIRMED" as any,
      });

      expect(mockOrderStatusHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: order.id,
          status: "CONFIRMED",
          changedBy: ADMIN_ID,
        }),
      });
    });

    it("uses a default note when no note is supplied", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: "CONFIRMED" as any,
      });

      const historyCall = mockOrderStatusHistoryCreate.mock.calls[0][0];
      expect(historyCall.data.note).toBe("Status updated to CONFIRMED");
    });

    it("uses the caller-supplied note when provided", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: "CONFIRMED" as any,
        note: "Manually confirmed by ops team",
      });

      const historyCall = mockOrderStatusHistoryCreate.mock.calls[0][0];
      expect(historyCall.data.note).toBe("Manually confirmed by ops team");
    });

    it("returns the orderNumber and new status", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      const result = await adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, {
        status: "CONFIRMED" as any,
      });

      expect(result).toEqual({ orderNumber: "ORD-001", status: "CONFIRMED" });
    });

    it("throws 404 NOT_FOUND when order does not exist", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(
        adminOrderService.updateStatus("ORD-MISSING", ADMIN_ID, { status: "CONFIRMED" as any })
      ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });

      expect(mockOrderUpdate).not.toHaveBeenCalled();
      expect(mockOrderStatusHistoryCreate).not.toHaveBeenCalled();
    });

    it("propagates database errors from order.update", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockRejectedValue(new Error("Write failed"));
      mockOrderStatusHistoryCreate.mockResolvedValue({});

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: "CONFIRMED" as any })
      ).rejects.toThrow("Write failed");
    });

    it("propagates database errors from orderStatusHistory.create", async () => {
      const order = makeOrder({ status: "PLACED" });
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderUpdate.mockResolvedValue({});
      mockOrderStatusHistoryCreate.mockRejectedValue(new Error("History write failed"));

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: "CONFIRMED" as any })
      ).rejects.toThrow("History write failed");
    });

    it("includes current and target statuses in the error message", async () => {
      const order = makeOrder({ status: "PROCESSING" });
      mockOrderFindUnique.mockResolvedValue(order);

      await expect(
        adminOrderService.updateStatus(order.orderNumber, ADMIN_ID, { status: "PLACED" as any })
      ).rejects.toMatchObject({
        message: expect.stringContaining("PROCESSING"),
      });
    });
  });

  // -------------------------------------------------------------------------
  // addNote
  // -------------------------------------------------------------------------

  describe("addNote", () => {
    const ADMIN_ID = "admin-id-1";

    it("creates and returns a note for an existing order", async () => {
      const order = makeOrder();
      const note = makeNote();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(note);

      const data: AddOrderNoteInput = { content: "Checked and confirmed", isInternal: true };
      const result = await adminOrderService.addNote(order.orderNumber, ADMIN_ID, data);

      expect(result).toEqual(note);
    });

    it("calls orderNote.create with orderId, adminId, content and isInternal", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote());

      const data: AddOrderNoteInput = { content: "Follow up required", isInternal: false };
      await adminOrderService.addNote(order.orderNumber, ADMIN_ID, data);

      expect(mockOrderNoteCreate).toHaveBeenCalledWith({
        data: {
          orderId: order.id,
          userId: ADMIN_ID,
          content: "Follow up required",
          isInternal: false,
        },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
    });

    it("creates a public (non-internal) note when isInternal is false", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote({ isInternal: false }));

      const data: AddOrderNoteInput = { content: "Shared with customer", isInternal: false };
      await adminOrderService.addNote(order.orderNumber, ADMIN_ID, data);

      const noteData = mockOrderNoteCreate.mock.calls[0][0].data;
      expect(noteData.isInternal).toBe(false);
    });

    it("includes user first/last name in the note result", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote());

      await adminOrderService.addNote(order.orderNumber, ADMIN_ID, {
        content: "Test",
        isInternal: true,
      });

      const [call] = mockOrderNoteCreate.mock.calls;
      expect(call[0].include).toEqual({
        user: { select: { firstName: true, lastName: true } },
      });
    });

    it("throws 404 NOT_FOUND when order does not exist", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      await expect(
        adminOrderService.addNote("ORD-MISSING", ADMIN_ID, {
          content: "Should not be created",
          isInternal: true,
        })
      ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });

      expect(mockOrderNoteCreate).not.toHaveBeenCalled();
    });

    it("propagates database errors from orderNote.create", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockRejectedValue(new Error("Note write failed"));

      await expect(
        adminOrderService.addNote(order.orderNumber, ADMIN_ID, {
          content: "Crash test",
          isInternal: true,
        })
      ).rejects.toThrow("Note write failed");
    });

    it("looks up the order by orderNumber before creating the note", async () => {
      const order = makeOrder();
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote());

      await adminOrderService.addNote("ORD-001", ADMIN_ID, {
        content: "Test",
        isInternal: true,
      });

      expect(mockOrderFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderNumber: "ORD-001" } })
      );
    });

    it("handles note content with special characters and unicode", async () => {
      const order = makeOrder();
      const specialContent = "Order flagged ⚠️ — côte d'Ivoire, <script>alert(1)</script>";
      mockOrderFindUnique.mockResolvedValue(order);
      mockOrderNoteCreate.mockResolvedValue(makeNote({ content: specialContent }));

      const result = await adminOrderService.addNote(order.orderNumber, ADMIN_ID, {
        content: specialContent,
        isInternal: true,
      });

      const noteData = mockOrderNoteCreate.mock.calls[0][0].data;
      expect(noteData.content).toBe(specialContent);
      expect((result as any).content).toBe(specialContent);
    });
  });
});
