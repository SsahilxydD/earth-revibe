import { describe, it, expect } from "vitest";
import { parsePagination, buildPaginatedResponse } from "../pagination";

describe("parsePagination", () => {
  it("should return defaults when no params provided", () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("should parse valid page and limit", () => {
    const result = parsePagination({ page: "3", limit: "50" });
    expect(result).toEqual({ page: 3, limit: 50 });
  });

  it("should clamp page to minimum of 1", () => {
    const result = parsePagination({ page: "0" });
    expect(result.page).toBe(1);

    const result2 = parsePagination({ page: "-5" });
    expect(result2.page).toBe(1);
  });

  it("should fall back to default when limit is 0 or negative", () => {
    // parseInt("0") => 0, and 0 || 20 => 20 (falsy fallback to default)
    const result = parsePagination({ limit: "0" });
    expect(result.limit).toBe(20);

    // parseInt("-10") => -10 (truthy), -10 || 20 => -10, Math.max(1, -10) => 1
    const result2 = parsePagination({ limit: "-10" });
    expect(result2.limit).toBe(1);
  });

  it("should clamp limit of 1 correctly", () => {
    const result = parsePagination({ limit: "1" });
    expect(result.limit).toBe(1);
  });

  it("should clamp limit to maxLimit (default 100)", () => {
    const result = parsePagination({ limit: "500" });
    expect(result.limit).toBe(100);
  });

  it("should respect custom maxLimit", () => {
    const result = parsePagination({ limit: "30" }, 25);
    expect(result.limit).toBe(25);
  });

  it("should handle non-numeric strings gracefully", () => {
    const result = parsePagination({ page: "abc", limit: "xyz" });
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("should handle float strings by truncating", () => {
    const result = parsePagination({ page: "2.7", limit: "15.3" });
    expect(result).toEqual({ page: 2, limit: 15 });
  });
});

describe("buildPaginatedResponse", () => {
  it("should build correct pagination metadata", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildPaginatedResponse(items, 50, { page: 1, limit: 20 });

    expect(result).toEqual({
      items,
      pagination: {
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    });
  });

  it("should set hasPrev=true for pages after first", () => {
    const result = buildPaginatedResponse([], 50, { page: 2, limit: 20 });
    expect(result.pagination.hasPrev).toBe(true);
  });

  it("should set hasNext=false on last page", () => {
    const result = buildPaginatedResponse([], 50, { page: 3, limit: 20 });
    expect(result.pagination.hasNext).toBe(false);
  });

  it("should handle empty results", () => {
    const result = buildPaginatedResponse([], 0, { page: 1, limit: 20 });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it("should handle single page of results", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = buildPaginatedResponse(items, 3, { page: 1, limit: 20 });

    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it("should not mutate the input items array", () => {
    const items = [{ id: 1 }];
    const itemsCopy = [...items];
    buildPaginatedResponse(items, 1, { page: 1, limit: 20 });
    expect(items).toEqual(itemsCopy);
  });
});
