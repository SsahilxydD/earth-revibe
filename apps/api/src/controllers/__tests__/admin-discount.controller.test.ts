import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("@earth-revibe/db", () => ({
  prisma: {
    discountCode: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  Prisma: {},
}));

import { prisma } from "@earth-revibe/db";
import { adminDiscountController } from "../admin-discount.controller";
import { ApiError } from "../../utils/api-error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response & {
  _status: number;
  _json: unknown;
  _message: string;
} {
  const res = {
    _status: 200,
    _json: undefined as unknown,
    _message: "",
    status(code: number) {
      this._status = code;
      return this;
    },
    json(payload: unknown) {
      this._json = payload;
      return this;
    },
  };
  return res as unknown as Response & {
    _status: number;
    _json: unknown;
    _message: string;
  };
}

// Typed shorthand for the mocked prisma discount methods
const mockDiscountCode = prisma.discountCode as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// A minimal discount record used across tests
const baseDiscount = {
  id: "disc-001",
  code: "SAVE10",
  description: "10% off",
  type: "PERCENTAGE",
  value: 10,
  minOrderValue: null,
  maxDiscountAmount: null,
  usageLimit: null,
  usageCount: 0,
  isActive: true,
  startsAt: new Date("2026-01-01"),
  expiresAt: new Date("2026-12-31"),
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ---------------------------------------------------------------------------
// beforeEach — reset all mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// listDiscounts
// ===========================================================================

describe("adminDiscountController.listDiscounts", () => {
  it("returns discounts with default pagination when no query params", async () => {
    mockDiscountCode.findMany.mockResolvedValue([baseDiscount]);
    mockDiscountCode.count.mockResolvedValue(1);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: "desc" },
      })
    );
    expect(mockDiscountCode.count).toHaveBeenCalledWith({ where: {} });

    const body = res._json as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data.discounts).toEqual([baseDiscount]);
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(20);
    expect(body.data.totalPages).toBe(1);
  });

  it("applies custom page and limit", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(100);

    const req = makeReq({ query: { page: "3", limit: "10" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );

    const body = res._json as { success: boolean; data: Record<string, unknown> };
    expect(body.data.page).toBe(3);
    expect(body.data.limit).toBe(10);
    expect(body.data.totalPages).toBe(10);
  });

  it("applies search filter with case-insensitive contains", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: { search: "save" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: { contains: "save", mode: "insensitive" } },
      })
    );
  });

  it("applies isActive=true filter", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: { isActive: "true" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    );
  });

  it("applies isActive=false filter", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: { isActive: "false" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: false } })
    );
  });

  it("does NOT set isActive filter for arbitrary string values", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: { isActive: "yes" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    const callArg = mockDiscountCode.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("isActive");
  });

  it("applies type filter", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: { type: "FLAT" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "FLAT" } })
    );
  });

  it("combines search, isActive, and type filters simultaneously", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({
      query: { search: "promo", isActive: "true", type: "PERCENTAGE" },
    });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    expect(mockDiscountCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: { contains: "promo", mode: "insensitive" },
          isActive: true,
          type: "PERCENTAGE",
        },
      })
    );
  });

  it("calculates totalPages correctly when total is not evenly divisible", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(21);

    const req = makeReq({ query: { page: "1", limit: "20" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    const body = res._json as { success: boolean; data: Record<string, unknown> };
    expect(body.data.totalPages).toBe(2);
  });

  it("returns totalPages of 0 when there are no records", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    const body = res._json as { success: boolean; data: Record<string, unknown> };
    expect(body.data.totalPages).toBe(0);
  });

  it("returns an empty discounts array when none match", async () => {
    mockDiscountCode.findMany.mockResolvedValue([]);
    mockDiscountCode.count.mockResolvedValue(0);

    const req = makeReq({ query: { search: "NOMATCH" } });
    const res = makeRes();

    await adminDiscountController.listDiscounts(req, res);

    const body = res._json as { success: boolean; data: Record<string, unknown> };
    expect(body.data.discounts).toEqual([]);
    expect(body.data.total).toBe(0);
  });

  it("runs findMany and count in parallel (both called once)", async () => {
    mockDiscountCode.findMany.mockResolvedValue([baseDiscount]);
    mockDiscountCode.count.mockResolvedValue(1);

    await adminDiscountController.listDiscounts(makeReq(), makeRes());

    expect(mockDiscountCode.findMany).toHaveBeenCalledTimes(1);
    expect(mockDiscountCode.count).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// getDiscount
// ===========================================================================

describe("adminDiscountController.getDiscount", () => {
  it("returns a discount when found", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(baseDiscount);

    const req = makeReq({ params: { id: "disc-001" } });
    const res = makeRes();

    await adminDiscountController.getDiscount(req, res);

    expect(mockDiscountCode.findUnique).toHaveBeenCalledWith({
      where: { id: "disc-001" },
    });

    const body = res._json as { success: boolean; data: typeof baseDiscount };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(baseDiscount);
  });

  it("throws ApiError.notFound when discount does not exist", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    const req = makeReq({ params: { id: "nonexistent" } });
    const res = makeRes();

    await expect(
      adminDiscountController.getDiscount(req, res)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Discount code not found",
    });
  });

  it("thrown error is an instance of ApiError", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    await expect(
      adminDiscountController.getDiscount(makeReq({ params: { id: "x" } }), makeRes())
    ).rejects.toBeInstanceOf(ApiError);
  });
});

// ===========================================================================
// createDiscount
// ===========================================================================

describe("adminDiscountController.createDiscount", () => {
  const validBody = {
    code: "save10",
    description: "10% off everything",
    type: "PERCENTAGE",
    value: 10,
    minOrderValue: 500,
    maxDiscountAmount: 200,
    usageLimit: 100,
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-12-31T23:59:59.000Z",
  };

  it("creates a discount and returns 201 with the new record", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);
    mockDiscountCode.create.mockResolvedValue({
      ...baseDiscount,
      code: "SAVE10",
    });

    const req = makeReq({ body: validBody });
    const res = makeRes();

    await adminDiscountController.createDiscount(req, res);

    expect(res._status).toBe(201);

    const body = res._json as { success: boolean; data: typeof baseDiscount };
    expect(body.success).toBe(true);
    expect(body.data.code).toBe("SAVE10");
  });

  it("uppercases the code before duplicate check and before persisting", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);
    mockDiscountCode.create.mockResolvedValue({ ...baseDiscount, code: "SAVE10" });

    const req = makeReq({ body: { ...validBody, code: "save10" } });
    const res = makeRes();

    await adminDiscountController.createDiscount(req, res);

    // Duplicate check must use uppercased code
    expect(mockDiscountCode.findUnique).toHaveBeenCalledWith({
      where: { code: "SAVE10" },
    });

    // create must also use uppercased code
    const createCall = mockDiscountCode.create.mock.calls[0][0];
    expect(createCall.data.code).toBe("SAVE10");
  });

  it("throws ApiError.conflict when code already exists", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(baseDiscount);

    const req = makeReq({ body: validBody });
    const res = makeRes();

    await expect(
      adminDiscountController.createDiscount(req, res)
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
      message: "Discount code already exists",
    });

    expect(mockDiscountCode.create).not.toHaveBeenCalled();
  });

  it("stores null for optional fields when they are falsy", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);
    mockDiscountCode.create.mockResolvedValue({ ...baseDiscount });

    const bodyWithoutOptionals = {
      code: "FREE",
      type: "FLAT",
      value: 50,
      startsAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-12-31T23:59:59.000Z",
    };

    const req = makeReq({ body: bodyWithoutOptionals });
    const res = makeRes();

    await adminDiscountController.createDiscount(req, res);

    const createData = mockDiscountCode.create.mock.calls[0][0].data;
    expect(createData.description).toBeNull();
    expect(createData.minOrderValue).toBeNull();
    expect(createData.maxDiscountAmount).toBeNull();
    expect(createData.usageLimit).toBeNull();
  });

  it("converts startsAt and expiresAt strings to Date objects", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);
    mockDiscountCode.create.mockResolvedValue({ ...baseDiscount });

    const req = makeReq({ body: validBody });
    const res = makeRes();

    await adminDiscountController.createDiscount(req, res);

    const createData = mockDiscountCode.create.mock.calls[0][0].data;
    expect(createData.startsAt).toBeInstanceOf(Date);
    expect(createData.expiresAt).toBeInstanceOf(Date);
  });

  it("does not call create when duplicate check throws", async () => {
    mockDiscountCode.findUnique.mockRejectedValue(new Error("DB connection lost"));

    const req = makeReq({ body: validBody });
    const res = makeRes();

    await expect(
      adminDiscountController.createDiscount(req, res)
    ).rejects.toThrow("DB connection lost");

    expect(mockDiscountCode.create).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// updateDiscount
// ===========================================================================

describe("adminDiscountController.updateDiscount", () => {
  const existingDiscount = { ...baseDiscount, id: "disc-001", code: "SAVE10" };

  it("updates a discount and returns the updated record", async () => {
    const updated = { ...existingDiscount, value: 15 };
    mockDiscountCode.findUnique.mockResolvedValue(existingDiscount);
    mockDiscountCode.update.mockResolvedValue(updated);

    const req = makeReq({
      params: { id: "disc-001" },
      body: { value: 15 },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    const body = res._json as { success: boolean; data: typeof existingDiscount };
    expect(body.success).toBe(true);
    expect(body.data.value).toBe(15);
  });

  it("throws ApiError.notFound when discount does not exist", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    const req = makeReq({ params: { id: "ghost" }, body: { value: 5 } });
    const res = makeRes();

    await expect(
      adminDiscountController.updateDiscount(req, res)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Discount code not found",
    });

    expect(mockDiscountCode.update).not.toHaveBeenCalled();
  });

  it("throws ApiError.conflict when new code already exists on another record", async () => {
    const differentDiscount = { ...baseDiscount, id: "disc-002", code: "FLAT20" };
    // First findUnique — fetch the record being updated
    mockDiscountCode.findUnique
      .mockResolvedValueOnce(existingDiscount)
      // Second findUnique — uniqueness check for new code
      .mockResolvedValueOnce(differentDiscount);

    const req = makeReq({
      params: { id: "disc-001" },
      body: { code: "flat20" },
    });
    const res = makeRes();

    await expect(
      adminDiscountController.updateDiscount(req, res)
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
      message: "Discount code already exists",
    });

    expect(mockDiscountCode.update).not.toHaveBeenCalled();
  });

  it("skips duplicate code check when code is unchanged (same code, different case)", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(existingDiscount);
    mockDiscountCode.update.mockResolvedValue(existingDiscount);

    // Sending the same code but in lowercase — toUpperCase() === existing.code
    const req = makeReq({
      params: { id: "disc-001" },
      body: { code: "save10" },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    // findUnique should only have been called once (for the initial existence check)
    expect(mockDiscountCode.findUnique).toHaveBeenCalledTimes(1);
    expect(mockDiscountCode.update).toHaveBeenCalledTimes(1);
  });

  it("uppercases the code when updating", async () => {
    mockDiscountCode.findUnique
      .mockResolvedValueOnce(existingDiscount)  // exists check
      .mockResolvedValueOnce(null);             // uniqueness check — no duplicate
    mockDiscountCode.update.mockResolvedValue({ ...existingDiscount, code: "NEWCODE" });

    const req = makeReq({
      params: { id: "disc-001" },
      body: { code: "newcode" },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    const updateCall = mockDiscountCode.update.mock.calls[0][0];
    expect(updateCall.data.code).toBe("NEWCODE");
  });

  it("only sends provided fields in the update payload", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(existingDiscount);
    mockDiscountCode.update.mockResolvedValue({ ...existingDiscount, value: 25 });

    const req = makeReq({
      params: { id: "disc-001" },
      body: { value: 25 },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    const updateData = mockDiscountCode.update.mock.calls[0][0].data;
    // Only 'value' should be in the payload
    expect(updateData).toHaveProperty("value", 25);
    expect(updateData).not.toHaveProperty("code");
    expect(updateData).not.toHaveProperty("type");
    expect(updateData).not.toHaveProperty("description");
    expect(updateData).not.toHaveProperty("startsAt");
    expect(updateData).not.toHaveProperty("expiresAt");
  });

  it("converts startsAt and expiresAt strings to Date objects when provided", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(existingDiscount);
    mockDiscountCode.update.mockResolvedValue(existingDiscount);

    const req = makeReq({
      params: { id: "disc-001" },
      body: {
        startsAt: "2026-06-01T00:00:00.000Z",
        expiresAt: "2026-09-30T23:59:59.000Z",
      },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    const updateData = mockDiscountCode.update.mock.calls[0][0].data;
    expect(updateData.startsAt).toBeInstanceOf(Date);
    expect(updateData.expiresAt).toBeInstanceOf(Date);
  });

  it("sets optional fields to null when provided as falsy values", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(existingDiscount);
    mockDiscountCode.update.mockResolvedValue(existingDiscount);

    const req = makeReq({
      params: { id: "disc-001" },
      body: {
        description: "",
        minOrderValue: 0,
        maxDiscountAmount: 0,
        usageLimit: 0,
      },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    const updateData = mockDiscountCode.update.mock.calls[0][0].data;
    expect(updateData.description).toBeNull();
    expect(updateData.minOrderValue).toBeNull();
    expect(updateData.maxDiscountAmount).toBeNull();
    expect(updateData.usageLimit).toBeNull();
  });

  it("passes the correct id to the update call", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(existingDiscount);
    mockDiscountCode.update.mockResolvedValue(existingDiscount);

    const req = makeReq({
      params: { id: "disc-001" },
      body: { value: 5 },
    });
    const res = makeRes();

    await adminDiscountController.updateDiscount(req, res);

    expect(mockDiscountCode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "disc-001" } })
    );
  });
});

// ===========================================================================
// deleteDiscount
// ===========================================================================

describe("adminDiscountController.deleteDiscount", () => {
  it("deletes the discount and returns a success message", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(baseDiscount);
    mockDiscountCode.delete.mockResolvedValue(baseDiscount);

    const req = makeReq({ params: { id: "disc-001" } });
    const res = makeRes();

    await adminDiscountController.deleteDiscount(req, res);

    expect(mockDiscountCode.delete).toHaveBeenCalledWith({
      where: { id: "disc-001" },
    });

    const body = res._json as { success: boolean; message: string };
    expect(body.success).toBe(true);
    expect(body.message).toBe("Discount code deleted");
  });

  it("throws ApiError.notFound when discount does not exist", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    const req = makeReq({ params: { id: "ghost" } });
    const res = makeRes();

    await expect(
      adminDiscountController.deleteDiscount(req, res)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Discount code not found",
    });

    expect(mockDiscountCode.delete).not.toHaveBeenCalled();
  });

  it("does not call delete when existence check fails with a DB error", async () => {
    mockDiscountCode.findUnique.mockRejectedValue(new Error("Connection timeout"));

    await expect(
      adminDiscountController.deleteDiscount(
        makeReq({ params: { id: "disc-001" } }),
        makeRes()
      )
    ).rejects.toThrow("Connection timeout");

    expect(mockDiscountCode.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// toggleActive
// ===========================================================================

describe("adminDiscountController.toggleActive", () => {
  it("toggles isActive from true to false", async () => {
    const activeDiscount = { ...baseDiscount, isActive: true };
    const toggled = { ...baseDiscount, isActive: false };

    mockDiscountCode.findUnique.mockResolvedValue(activeDiscount);
    mockDiscountCode.update.mockResolvedValue(toggled);

    const req = makeReq({ params: { id: "disc-001" } });
    const res = makeRes();

    await adminDiscountController.toggleActive(req, res);

    expect(mockDiscountCode.update).toHaveBeenCalledWith({
      where: { id: "disc-001" },
      data: { isActive: false },
    });

    const body = res._json as { success: boolean; data: typeof baseDiscount };
    expect(body.success).toBe(true);
    expect(body.data.isActive).toBe(false);
  });

  it("toggles isActive from false to true", async () => {
    const inactiveDiscount = { ...baseDiscount, isActive: false };
    const toggled = { ...baseDiscount, isActive: true };

    mockDiscountCode.findUnique.mockResolvedValue(inactiveDiscount);
    mockDiscountCode.update.mockResolvedValue(toggled);

    const req = makeReq({ params: { id: "disc-001" } });
    const res = makeRes();

    await adminDiscountController.toggleActive(req, res);

    expect(mockDiscountCode.update).toHaveBeenCalledWith({
      where: { id: "disc-001" },
      data: { isActive: true },
    });

    const body = res._json as { success: boolean; data: typeof baseDiscount };
    expect(body.data.isActive).toBe(true);
  });

  it("throws ApiError.notFound when discount does not exist", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    const req = makeReq({ params: { id: "ghost" } });
    const res = makeRes();

    await expect(
      adminDiscountController.toggleActive(req, res)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Discount code not found",
    });

    expect(mockDiscountCode.update).not.toHaveBeenCalled();
  });

  it("uses the exact current isActive value to compute the toggle", async () => {
    const activeDiscount = { ...baseDiscount, isActive: true };
    mockDiscountCode.findUnique.mockResolvedValue(activeDiscount);
    mockDiscountCode.update.mockResolvedValue({ ...activeDiscount, isActive: false });

    await adminDiscountController.toggleActive(
      makeReq({ params: { id: "disc-001" } }),
      makeRes()
    );

    const updateArgs = mockDiscountCode.update.mock.calls[0][0];
    // Must explicitly negate the found discount's isActive
    expect(updateArgs.data.isActive).toBe(!activeDiscount.isActive);
  });

  it("returns the updated record from the update call, not the pre-update record", async () => {
    const before = { ...baseDiscount, isActive: true };
    const after = { ...baseDiscount, isActive: false };

    mockDiscountCode.findUnique.mockResolvedValue(before);
    mockDiscountCode.update.mockResolvedValue(after);

    const res = makeRes();
    await adminDiscountController.toggleActive(
      makeReq({ params: { id: "disc-001" } }),
      res
    );

    const body = res._json as { success: boolean; data: typeof baseDiscount };
    expect(body.data).toEqual(after);
    expect(body.data).not.toEqual(before);
  });
});

// ===========================================================================
// Cross-cutting: ApiError structure
// ===========================================================================

describe("ApiError shape emitted by the controller", () => {
  it("notFound error has statusCode 404 and code NOT_FOUND", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(null);

    let caught: unknown;
    try {
      await adminDiscountController.getDiscount(
        makeReq({ params: { id: "x" } }),
        makeRes()
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).statusCode).toBe(404);
    expect((caught as ApiError).code).toBe("NOT_FOUND");
  });

  it("conflict error has statusCode 409 and code CONFLICT", async () => {
    mockDiscountCode.findUnique.mockResolvedValue(baseDiscount);

    let caught: unknown;
    try {
      await adminDiscountController.createDiscount(
        makeReq({
          body: {
            code: "SAVE10",
            type: "PERCENTAGE",
            value: 10,
            startsAt: "2026-01-01",
            expiresAt: "2026-12-31",
          },
        }),
        makeRes()
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).statusCode).toBe(409);
    expect((caught as ApiError).code).toBe("CONFLICT");
  });
});
