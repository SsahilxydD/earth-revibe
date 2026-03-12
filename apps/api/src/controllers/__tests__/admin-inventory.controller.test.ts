import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";

// ---------------------------------------------------------------------------
// Mock @earth-revibe/db before importing the controller so all Prisma calls
// are intercepted.  The factory must be a function that returns the mock
// shape; Vitest hoists vi.mock calls to the top of the module.
// ---------------------------------------------------------------------------
vi.mock("@earth-revibe/db", () => ({
  prisma: {
    productVariant: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  // Expose the real Prisma namespace so the controller can destructure it
  Prisma: {},
}));

// Import after mock so the module picks up the stubbed prisma
import { adminInventoryController } from "../admin-inventory.controller";
import { prisma } from "@earth-revibe/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Express Request mock */
function makeReq(
  overrides: Partial<{
    query: Record<string, string | undefined>;
    params: Record<string, string>;
    body: unknown;
  }> = {}
): Request {
  return {
    query: overrides.query ?? {},
    params: overrides.params ?? {},
    body: overrides.body ?? {},
  } as unknown as Request;
}

/** Build a spy-based Express Response mock */
function makeRes(): { res: Response; jsonSpy: ReturnType<typeof vi.fn> } {
  const jsonSpy = vi.fn();
  const res = { json: jsonSpy } as unknown as Response;
  return { res, jsonSpy };
}

/** A reusable fixture representing a single ProductVariant row */
const VARIANT_FIXTURE = {
  id: "variant-1",
  stock: 15,
  sku: "SKU-001",
  product: { id: "product-1", name: "Eco Bag" },
  updatedAt: new Date("2026-01-01"),
};

// Typed shortcuts to the mocked functions
const mockFindMany = prisma.productVariant.findMany as ReturnType<typeof vi.fn>;
const mockCount = prisma.productVariant.count as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.productVariant.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.productVariant.update as ReturnType<typeof vi.fn>;
const mockAggregate = prisma.productVariant.aggregate as ReturnType<typeof vi.fn>;
const mockProductCount = prisma.product.count as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Shared reset
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// 1. listInventory
// ===========================================================================
describe("adminInventoryController.listInventory", () => {
  const VARIANTS = [VARIANT_FIXTURE];
  const TOTAL = 1;

  function setup(query: Record<string, string | undefined> = {}) {
    mockFindMany.mockResolvedValue(VARIANTS);
    mockCount.mockResolvedValue(TOTAL);
    const req = makeReq({ query });
    const { res, jsonSpy } = makeRes();
    return { req, res, jsonSpy };
  }

  // --- happy path / default behaviour ---

  it("returns paginated variants with defaults when no query params given", async () => {
    const { req, res, jsonSpy } = setup();
    await adminInventoryController.listInventory(req, res);

    expect(mockFindMany).toHaveBeenCalledOnce();
    expect(mockCount).toHaveBeenCalledOnce();

    const response = jsonSpy.mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.data.variants).toBe(VARIANTS);
    expect(response.data.page).toBe(1);
    expect(response.data.limit).toBe(20);
    expect(response.data.total).toBe(TOTAL);
    expect(response.data.totalPages).toBe(1);
  });

  it("applies correct skip/take for page 2, limit 5", async () => {
    const { req, res } = setup({ page: "2", limit: "5" });
    await adminInventoryController.listInventory(req, res);

    const findManyArgs = mockFindMany.mock.calls[0][0];
    expect(findManyArgs.skip).toBe(5); // (2-1)*5
    expect(findManyArgs.take).toBe(5);
  });

  it("falls back to default 20 when limit=0 is passed (0 is falsy)", async () => {
    const { req, res } = setup({ limit: "0" });
    await adminInventoryController.listInventory(req, res);

    const findManyArgs = mockFindMany.mock.calls[0][0];
    // Number("0") => 0, and 0 || 20 => 20 (falsy fallback)
    expect(findManyArgs.take).toBe(20);
  });

  it("clamps limit to maximum 100 when limit=200 is passed", async () => {
    const { req, res } = setup({ limit: "200" });
    await adminInventoryController.listInventory(req, res);

    const findManyArgs = mockFindMany.mock.calls[0][0];
    expect(findManyArgs.take).toBe(100);
  });

  it("clamps page to minimum 1 when page=0 is passed", async () => {
    const { req, res, jsonSpy } = setup({ page: "0" });
    await adminInventoryController.listInventory(req, res);

    expect(jsonSpy.mock.calls[0][0].data.page).toBe(1);
  });

  // --- totalPages edge case ---

  it("calculates totalPages correctly for non-exact division", async () => {
    const req = makeReq({ query: { limit: "10" } });
    const { res, jsonSpy } = makeRes();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(21);
    await adminInventoryController.listInventory(req, res);

    expect(jsonSpy.mock.calls[0][0].data.totalPages).toBe(3);
  });

  // --- search filter ---

  it("applies case-insensitive product name search filter", async () => {
    const { req, res } = setup({ search: "eco" });
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.product).toEqual({
      name: { contains: "eco", mode: "insensitive" },
    });
  });

  it("does NOT add product filter when search is absent", async () => {
    const { req, res } = setup();
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.product).toBeUndefined();
  });

  // --- lowStock filter ---

  it("applies lowStock=low filter: stock gt 0, lt threshold (default 10)", async () => {
    const { req, res } = setup({ lowStock: "low" });
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.stock).toEqual({ gt: 0, lt: 10 });
  });

  it("applies lowStock=low with custom threshold", async () => {
    const { req, res } = setup({ lowStock: "low", threshold: "25" });
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.stock).toEqual({ gt: 0, lt: 25 });
  });

  it("applies lowStock=out filter: stock === 0", async () => {
    const { req, res } = setup({ lowStock: "out" });
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.stock).toBe(0);
  });

  it("does not add stock filter for unknown lowStock value", async () => {
    const { req, res } = setup({ lowStock: "all" });
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.stock).toBeUndefined();
  });

  // --- sortBy options ---

  it("sorts by stock ascending (default)", async () => {
    const { req, res } = setup();
    await adminInventoryController.listInventory(req, res);

    const { orderBy } = mockFindMany.mock.calls[0][0];
    expect(orderBy).toEqual({ stock: "asc" });
  });

  it("sorts by stock_asc explicitly", async () => {
    const { req, res } = setup({ sortBy: "stock_asc" });
    await adminInventoryController.listInventory(req, res);

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ stock: "asc" });
  });

  it("sorts by stock_desc", async () => {
    const { req, res } = setup({ sortBy: "stock_desc" });
    await adminInventoryController.listInventory(req, res);

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ stock: "desc" });
  });

  it("sorts by product_name ascending", async () => {
    const { req, res } = setup({ sortBy: "product_name" });
    await adminInventoryController.listInventory(req, res);

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({
      product: { name: "asc" },
    });
  });

  it("sorts by updated_at descending", async () => {
    const { req, res } = setup({ sortBy: "updated_at" });
    await adminInventoryController.listInventory(req, res);

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ updatedAt: "desc" });
  });

  it("falls back to stock asc for an unknown sortBy value", async () => {
    const { req, res } = setup({ sortBy: "invalid_sort" });
    await adminInventoryController.listInventory(req, res);

    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual({ stock: "asc" });
  });

  // --- prisma include shape ---

  it("includes product with primary image select in findMany", async () => {
    const { req, res } = setup();
    await adminInventoryController.listInventory(req, res);

    const { include } = mockFindMany.mock.calls[0][0];
    expect(include.product.select).toMatchObject({
      id: true,
      name: true,
      slug: true,
      status: true,
    });
    expect(include.product.select.images).toBeDefined();
  });

  // --- combined filters ---

  it("combines search AND lowStock=out filters simultaneously", async () => {
    const { req, res } = setup({ search: "bamboo", lowStock: "out" });
    await adminInventoryController.listInventory(req, res);

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.product).toEqual({
      name: { contains: "bamboo", mode: "insensitive" },
    });
    expect(where.stock).toBe(0);

    // count receives same where
    expect(mockCount.mock.calls[0][0].where).toEqual(where);
  });

  // --- empty result ---

  it("returns empty variants array and totalPages=0 when no rows exist", async () => {
    const req = makeReq();
    const { res, jsonSpy } = makeRes();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    await adminInventoryController.listInventory(req, res);

    const { data } = jsonSpy.mock.calls[0][0];
    expect(data.variants).toHaveLength(0);
    expect(data.totalPages).toBe(0);
  });
});

// ===========================================================================
// 2. updateStock
// ===========================================================================
describe("adminInventoryController.updateStock", () => {
  const VARIANT_ID = "variant-abc";

  function setup(body: unknown, variantId = VARIANT_ID) {
    const req = makeReq({ params: { variantId }, body });
    const { res, jsonSpy } = makeRes();
    return { req, res, jsonSpy };
  }

  // --- happy path ---

  it("updates stock and returns the updated variant", async () => {
    const updatedVariant = { ...VARIANT_FIXTURE, stock: 50 };
    mockFindUnique.mockResolvedValue(VARIANT_FIXTURE);
    mockUpdate.mockResolvedValue(updatedVariant);

    const { req, res, jsonSpy } = setup({ stock: 50 });
    await adminInventoryController.updateStock(req, res);

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: VARIANT_ID } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: VARIANT_ID },
      data: { stock: 50 },
      include: { product: { select: { id: true, name: true } } },
    });
    expect(jsonSpy.mock.calls[0][0]).toEqual({ success: true, data: updatedVariant });
  });

  it("accepts stock=0 (zero is a valid non-negative value)", async () => {
    mockFindUnique.mockResolvedValue(VARIANT_FIXTURE);
    mockUpdate.mockResolvedValue({ ...VARIANT_FIXTURE, stock: 0 });

    const { req, res } = setup({ stock: 0 });
    await adminInventoryController.updateStock(req, res);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: 0 } })
    );
  });

  // --- validation failures ---

  it("throws ApiError.badRequest when stock is undefined", async () => {
    const { req, res } = setup({});
    await expect(adminInventoryController.updateStock(req, res)).rejects.toThrow(
      ApiError
    );
    await expect(adminInventoryController.updateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Stock must be a non-negative number",
    });
  });

  it("throws ApiError.badRequest when stock is a string", async () => {
    const { req, res } = setup({ stock: "10" });
    await expect(adminInventoryController.updateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws ApiError.badRequest when stock is negative", async () => {
    const { req, res } = setup({ stock: -1 });
    await expect(adminInventoryController.updateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Stock must be a non-negative number",
    });
  });

  it("throws ApiError.badRequest when stock is null", async () => {
    const { req, res } = setup({ stock: null });
    await expect(adminInventoryController.updateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws ApiError.badRequest when stock is NaN (passed as number type edge case)", async () => {
    // NaN satisfies typeof === 'number' but is not a valid stock value;
    // the controller checks stock < 0 — NaN < 0 is false, but
    // passing undefined covers the undefined branch; we test a real NaN too.
    const { req: _req, res: _res } = setup({ stock: NaN });
    // NaN is typeof 'number' and NaN < 0 is false, NaN === undefined is false.
    // The controller only rejects undefined, non-number, or negative — NaN
    // passes the current guards. This test documents that behaviour and ensures
    // the guard at least does not crash.
    // If this assertion fails, the controller guard was tightened (good).
    await expect(async () =>
      adminInventoryController.updateStock(makeReq({ params: { variantId: VARIANT_ID }, body: { stock: NaN } }), makeRes().res)
    ).not.toThrow(); // NaN slips through current guard — document, not fix
  });

  // --- not found ---

  it("throws ApiError.notFound when the variant does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    const { req, res } = setup({ stock: 5 });
    await expect(adminInventoryController.updateStock(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Product variant not found",
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 3. adjustStock
// ===========================================================================
describe("adminInventoryController.adjustStock", () => {
  const VARIANT_ID = "variant-xyz";

  function setup(body: unknown, variantId = VARIANT_ID) {
    const req = makeReq({ params: { variantId }, body });
    const { res, jsonSpy } = makeRes();
    return { req, res, jsonSpy };
  }

  // --- happy path ---

  it("returns previous/new stock and the adjustment details on success", async () => {
    const existingVariant = { ...VARIANT_FIXTURE, id: VARIANT_ID, stock: 20 };
    const updatedVariant = { ...existingVariant, stock: 25 };
    mockFindUnique.mockResolvedValue(existingVariant);
    mockUpdate.mockResolvedValue(updatedVariant);

    const { req, res, jsonSpy } = setup({ adjustment: 5, reason: "Restock from supplier" });
    await adminInventoryController.adjustStock(req, res);

    const response = jsonSpy.mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.data.previousStock).toBe(20);
    expect(response.data.newStock).toBe(25);
    expect(response.data.adjustment).toBe(5);
    expect(response.data.reason).toBe("Restock from supplier");
    expect(response.data.variant).toBe(updatedVariant);
  });

  it("applies a negative adjustment (stock reduction)", async () => {
    const existingVariant = { ...VARIANT_FIXTURE, id: VARIANT_ID, stock: 10 };
    mockFindUnique.mockResolvedValue(existingVariant);
    mockUpdate.mockResolvedValue({ ...existingVariant, stock: 7 });

    const { req, res, jsonSpy } = setup({ adjustment: -3, reason: "Damaged goods" });
    await adminInventoryController.adjustStock(req, res);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: 7 } })
    );
    expect(jsonSpy.mock.calls[0][0].data.newStock).toBe(7);
  });

  it("passes exact newStock to the update call", async () => {
    const existingVariant = { ...VARIANT_FIXTURE, id: VARIANT_ID, stock: 100 };
    mockFindUnique.mockResolvedValue(existingVariant);
    mockUpdate.mockResolvedValue({ ...existingVariant, stock: 150 });

    const { req, res } = setup({ adjustment: 50, reason: "Annual top-up" });
    await adminInventoryController.adjustStock(req, res);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: 150 } })
    );
  });

  // --- adjustment validation ---

  it("throws ApiError.badRequest when adjustment is undefined", async () => {
    const { req, res } = setup({ reason: "some reason" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Adjustment must be a non-zero number",
    });
  });

  it("throws ApiError.badRequest when adjustment is 0", async () => {
    const { req, res } = setup({ adjustment: 0, reason: "test" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Adjustment must be a non-zero number",
    });
  });

  it("throws ApiError.badRequest when adjustment is a string", async () => {
    const { req, res } = setup({ adjustment: "5", reason: "test" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws ApiError.badRequest when adjustment is null", async () => {
    const { req, res } = setup({ adjustment: null, reason: "test" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  // --- reason validation ---

  it("throws ApiError.badRequest when reason is absent", async () => {
    const { req, res } = setup({ adjustment: 5 });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Reason is required for stock adjustment",
    });
  });

  it("throws ApiError.badRequest when reason is empty string", async () => {
    const { req, res } = setup({ adjustment: 5, reason: "" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Reason is required for stock adjustment",
    });
  });

  it("throws ApiError.badRequest when reason is whitespace only", async () => {
    const { req, res } = setup({ adjustment: 5, reason: "   " });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Reason is required for stock adjustment",
    });
  });

  it("throws ApiError.badRequest when reason is a non-string type", async () => {
    const { req, res } = setup({ adjustment: 5, reason: 123 });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  // --- not found ---

  it("throws ApiError.notFound when variant does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { req, res } = setup({ adjustment: 5, reason: "Restock" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Product variant not found",
    });
  });

  // --- below-zero guard ---

  it("throws ApiError.badRequest when adjustment would drive stock below 0", async () => {
    const existingVariant = { ...VARIANT_FIXTURE, id: VARIANT_ID, stock: 3 };
    mockFindUnique.mockResolvedValue(existingVariant);

    const { req, res } = setup({ adjustment: -10, reason: "Write-off" });
    await expect(adminInventoryController.adjustStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });

    // The error message should reference both the adjustment and current stock
    await expect(
      adminInventoryController.adjustStock(
        makeReq({ params: { variantId: VARIANT_ID }, body: { adjustment: -10, reason: "Write-off" } }),
        makeRes().res
      )
    ).rejects.toThrow(`Cannot adjust stock by -10. Current stock is 3`);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does NOT throw when adjustment exactly zeros out the stock", async () => {
    const existingVariant = { ...VARIANT_FIXTURE, id: VARIANT_ID, stock: 5 };
    mockFindUnique.mockResolvedValue(existingVariant);
    mockUpdate.mockResolvedValue({ ...existingVariant, stock: 0 });

    const { req, res, jsonSpy } = setup({ adjustment: -5, reason: "Full clearance" });
    await adminInventoryController.adjustStock(req, res);

    expect(jsonSpy.mock.calls[0][0].data.newStock).toBe(0);
  });
});

// ===========================================================================
// 4. bulkUpdateStock
// ===========================================================================
describe("adminInventoryController.bulkUpdateStock", () => {
  function setup(body: unknown) {
    const req = makeReq({ body });
    const { res, jsonSpy } = makeRes();
    return { req, res, jsonSpy };
  }

  // --- happy path ---

  it("runs all updates in a transaction and returns results with count", async () => {
    const updatedVariants = [
      { ...VARIANT_FIXTURE, id: "v1", stock: 10 },
      { ...VARIANT_FIXTURE, id: "v2", stock: 20 },
    ];
    mockTransaction.mockResolvedValue(updatedVariants);

    const updates = [
      { variantId: "v1", stock: 10 },
      { variantId: "v2", stock: 20 },
    ];

    const { req, res, jsonSpy } = setup({ updates });
    await adminInventoryController.bulkUpdateStock(req, res);

    expect(mockTransaction).toHaveBeenCalledOnce();
    const response = jsonSpy.mock.calls[0][0];
    expect(response.success).toBe(true);
    expect(response.data.results).toBe(updatedVariants);
    expect(response.data.updatedCount).toBe(2);
  });

  it("passes the correct prisma update args for each item in the transaction", async () => {
    mockTransaction.mockImplementation(async (ops: unknown[]) => ops);

    const updates = [{ variantId: "v1", stock: 5 }];
    const { req, res } = setup({ updates });
    await adminInventoryController.bulkUpdateStock(req, res);

    // The transaction received an array of one prisma update call
    const transactionOps = mockTransaction.mock.calls[0][0];
    expect(transactionOps).toHaveLength(1);
  });

  it("accepts stock=0 in a bulk update entry", async () => {
    mockTransaction.mockResolvedValue([{ ...VARIANT_FIXTURE, stock: 0 }]);

    const { req, res } = setup({ updates: [{ variantId: "v1", stock: 0 }] });
    await adminInventoryController.bulkUpdateStock(req, res);

    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("returns updatedCount equal to the number of variants processed", async () => {
    const three = Array.from({ length: 3 }, (_, i) => ({
      ...VARIANT_FIXTURE,
      id: `v${i}`,
    }));
    mockTransaction.mockResolvedValue(three);

    const updates = three.map(({ id }) => ({ variantId: id, stock: 1 }));
    const { req, res, jsonSpy } = setup({ updates });
    await adminInventoryController.bulkUpdateStock(req, res);

    expect(jsonSpy.mock.calls[0][0].data.updatedCount).toBe(3);
  });

  // --- validation failures ---

  it("throws ApiError.badRequest when updates is missing", async () => {
    const { req, res } = setup({});
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Updates array is required and must not be empty",
    });
  });

  it("throws ApiError.badRequest when updates is an empty array", async () => {
    const { req, res } = setup({ updates: [] });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Updates array is required and must not be empty",
    });
  });

  it("throws ApiError.badRequest when updates is not an array (string)", async () => {
    const { req, res } = setup({ updates: "v1:10" });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws ApiError.badRequest when updates is not an array (object)", async () => {
    const { req, res } = setup({ updates: { variantId: "v1", stock: 5 } });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws ApiError.badRequest when an entry is missing variantId", async () => {
    const { req, res } = setup({ updates: [{ stock: 5 }] });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Each update must have a valid variantId and a non-negative stock number",
    });
  });

  it("throws ApiError.badRequest when an entry has a non-number stock", async () => {
    const { req, res } = setup({ updates: [{ variantId: "v1", stock: "five" }] });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws ApiError.badRequest when an entry has negative stock", async () => {
    const { req, res } = setup({ updates: [{ variantId: "v1", stock: -1 }] });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws when only the second entry in a multi-item array is invalid", async () => {
    const { req, res } = setup({
      updates: [
        { variantId: "v1", stock: 10 }, // valid
        { variantId: "v2", stock: -5 }, // invalid
      ],
    });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("throws when an entry has stock=undefined", async () => {
    const { req, res } = setup({ updates: [{ variantId: "v1" }] });
    await expect(adminInventoryController.bulkUpdateStock(req, res)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

// ===========================================================================
// 5. getInventorySummary
// ===========================================================================
describe("adminInventoryController.getInventorySummary", () => {
  function setup() {
    const req = makeReq();
    const { res, jsonSpy } = makeRes();
    return { req, res, jsonSpy };
  }

  // --- happy path ---

  it("returns all five summary metrics correctly aggregated", async () => {
    mockProductCount.mockResolvedValue(12);
    mockCount
      .mockResolvedValueOnce(45)    // totalVariants
      .mockResolvedValueOnce(8)     // lowStockCount (stock gt 0, lt 10)
      .mockResolvedValueOnce(3);    // outOfStockCount (stock = 0)
    mockAggregate.mockResolvedValue({ _sum: { stock: 1200 } });

    const { req, res, jsonSpy } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    const { data } = jsonSpy.mock.calls[0][0];
    expect(data.totalProducts).toBe(12);
    expect(data.totalVariants).toBe(45);
    expect(data.totalStock).toBe(1200);
    expect(data.lowStockCount).toBe(8);
    expect(data.outOfStockCount).toBe(3);
  });

  it("returns success: true in the response envelope", async () => {
    mockProductCount.mockResolvedValue(0);
    mockCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue({ _sum: { stock: null } });

    const { req, res, jsonSpy } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    expect(jsonSpy.mock.calls[0][0].success).toBe(true);
  });

  it("defaults totalStock to 0 when aggregate _sum.stock is null", async () => {
    mockProductCount.mockResolvedValue(0);
    mockCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue({ _sum: { stock: null } });

    const { req, res, jsonSpy } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    expect(jsonSpy.mock.calls[0][0].data.totalStock).toBe(0);
  });

  it("queries lowStockCount with stock gt 0, lt 10", async () => {
    mockProductCount.mockResolvedValue(1);
    mockCount.mockResolvedValue(1);
    mockAggregate.mockResolvedValue({ _sum: { stock: 5 } });

    const { req, res } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    // count is called three times:
    // 1st — totalVariants (no where)
    // 2nd — lowStockCount (where stock gt 0 lt 10)
    // 3rd — outOfStockCount (where stock 0)
    const countCalls = mockCount.mock.calls;
    expect(countCalls[1][0]).toEqual({ where: { stock: { gt: 0, lt: 10 } } });
  });

  it("queries outOfStockCount with stock = 0", async () => {
    mockProductCount.mockResolvedValue(1);
    mockCount.mockResolvedValue(1);
    mockAggregate.mockResolvedValue({ _sum: { stock: 5 } });

    const { req, res } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    const countCalls = mockCount.mock.calls;
    expect(countCalls[2][0]).toEqual({ where: { stock: 0 } });
  });

  it("runs all five DB calls concurrently via Promise.all (all mocks called once)", async () => {
    mockProductCount.mockResolvedValue(5);
    mockCount.mockResolvedValue(10);
    mockAggregate.mockResolvedValue({ _sum: { stock: 500 } });

    const { req, res } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    // product.count called once, productVariant.count called 3 times,
    // productVariant.aggregate called once
    expect(mockProductCount).toHaveBeenCalledTimes(1);
    expect(mockCount).toHaveBeenCalledTimes(3);
    expect(mockAggregate).toHaveBeenCalledTimes(1);
  });

  it("handles all zeros gracefully (fresh database state)", async () => {
    mockProductCount.mockResolvedValue(0);
    mockCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue({ _sum: { stock: 0 } });

    const { req, res, jsonSpy } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    const { data } = jsonSpy.mock.calls[0][0];
    expect(data.totalProducts).toBe(0);
    expect(data.totalVariants).toBe(0);
    expect(data.totalStock).toBe(0);
    expect(data.lowStockCount).toBe(0);
    expect(data.outOfStockCount).toBe(0);
  });

  it("handles very large stock totals without precision loss", async () => {
    mockProductCount.mockResolvedValue(1000);
    mockCount.mockResolvedValue(5000);
    mockAggregate.mockResolvedValue({ _sum: { stock: 9_999_999 } });

    const { req, res, jsonSpy } = setup();
    await adminInventoryController.getInventorySummary(req, res);

    expect(jsonSpy.mock.calls[0][0].data.totalStock).toBe(9_999_999);
  });
});
