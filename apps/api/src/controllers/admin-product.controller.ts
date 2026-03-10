import type { Request, Response } from "express";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import { productService } from "../services/product.service";
import slugify from "slugify";

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export const adminProductController = {
  async getProduct(req: Request, res: Response) {
    const product = await productService.getProductBySlug(
      req.params.slug as string,
      true // includeAll — show inactive variants too
    );
    res.json({ success: true, data: product });
  },

  async exportCSV(_req: Request, res: Response) {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        variants: { select: { sku: true, stock: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Name",
      "Slug",
      "Category",
      "Price",
      "Compare At Price",
      "SKU",
      "Stock",
      "Status",
      "Created Date",
    ];

    const rows = products.map((product) => {
      const skus = product.variants.map((v) => v.sku).join("; ");
      const totalStock = product.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0
      );

      return [
        escapeCSVField(product.name),
        escapeCSVField(product.slug),
        escapeCSVField(product.category?.name || ""),
        String(product.price),
        product.compareAtPrice ? String(product.compareAtPrice) : "",
        escapeCSVField(skus),
        String(totalStock),
        product.status,
        new Date(product.createdAt).toISOString().split("T")[0],
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="products-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
  },

  async importCSV(req: Request, res: Response) {
    const body =
      typeof req.body === "string" ? req.body : req.body?.csv;

    if (!body || typeof body !== "string") {
      throw ApiError.badRequest(
        "CSV content is required. Send as { csv: \"...\" } in JSON body."
      );
    }

    const lines = body
      .split("\n")
      .map((l: string) => l.replace(/\r$/, ""))
      .filter((l: string) => l.trim().length > 0);

    if (lines.length < 2) {
      throw ApiError.badRequest(
        "CSV must contain a header row and at least one data row"
      );
    }

    const headerRow = parseCSVLine(lines[0]);
    const headerMap: Record<string, number> = {};
    headerRow.forEach((h, i) => {
      headerMap[h.toLowerCase().trim()] = i;
    });

    // Validate required columns
    const requiredColumns = ["name", "slug", "price", "status"];
    for (const col of requiredColumns) {
      if (headerMap[col] === undefined) {
        throw ApiError.badRequest(`Missing required CSV column: ${col}`);
      }
    }

    // Pre-fetch all categories for matching
    const categories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>(
      categories.map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id])
    );

    const created: string[] = [];
    const updated: string[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);
        const getValue = (col: string) => {
          const idx = headerMap[col];
          return idx !== undefined ? fields[idx] || "" : "";
        };

        const name = getValue("name");
        const slug =
          getValue("slug") || slugify(name, { lower: true, strict: true });
        const priceStr = getValue("price");
        const compareAtPriceStr = getValue("compare at price");
        const categoryName = getValue("category");
        const status = getValue("status") || "DRAFT";

        if (!name || !priceStr) {
          errors.push({ row: i + 1, message: "Name and Price are required" });
          continue;
        }

        const price = parseFloat(priceStr);
        if (isNaN(price)) {
          errors.push({ row: i + 1, message: `Invalid price: ${priceStr}` });
          continue;
        }

        const compareAtPrice: number | undefined = compareAtPriceStr
          ? parseFloat(compareAtPriceStr)
          : undefined;

        // Resolve category
        let categoryId: string | undefined;
        if (categoryName) {
          categoryId = categoryMap.get(categoryName.toLowerCase());
          if (!categoryId) {
            errors.push({
              row: i + 1,
              message: `Category not found: ${categoryName}`,
            });
            continue;
          }
        }

        // Validate status
        const validStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"];
        if (!validStatuses.includes(status.toUpperCase())) {
          errors.push({
            row: i + 1,
            message: `Invalid status: ${status}`,
          });
          continue;
        }

        // Check for existing product by slug
        const existing = await prisma.product.findUnique({ where: { slug } });

        if (existing) {
          // Update existing
          const updateData: Record<string, unknown> = {
            name,
            price,
            status: status.toUpperCase(),
          };
          if (compareAtPrice !== undefined && !isNaN(compareAtPrice)) {
            updateData.compareAtPrice = compareAtPrice;
          }
          if (categoryId) {
            updateData.category = { connect: { id: categoryId } };
          }

          await prisma.product.update({
            where: { id: existing.id },
            data: updateData,
          });
          updated.push(name);
        } else {
          // Create new — require category
          if (!categoryId) {
            // Use the first category as fallback
            const firstCategory = categories[0];
            if (!firstCategory) {
              errors.push({
                row: i + 1,
                message: "No category available for new product",
              });
              continue;
            }
            categoryId = firstCategory.id;
          }

          await prisma.product.create({
            data: {
              name,
              slug,
              description: name,
              price,
              compareAtPrice:
                compareAtPrice !== undefined && !isNaN(compareAtPrice)
                  ? compareAtPrice
                  : undefined,
              status: status.toUpperCase(),
              categoryId,
            },
          });
          created.push(name);
        }
      } catch (err: unknown) {
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : "Unexpected error",
        });
      }
    }

    res.json({
      success: true,
      data: {
        created: created.length,
        updated: updated.length,
        errors: errors.length,
        createdProducts: created,
        updatedProducts: updated,
        errorDetails: errors,
      },
    });
  },

  async bulkUpdate(req: Request, res: Response) {
    const { productIds, updates } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw ApiError.badRequest(
        "productIds must be a non-empty array of product IDs"
      );
    }

    if (!updates || typeof updates !== "object") {
      throw ApiError.badRequest("updates object is required");
    }

    // Build update data from allowed fields
    const updateData: Record<string, unknown> = {};
    if (updates.price !== undefined) {
      const price = parseFloat(updates.price);
      if (isNaN(price) || price < 0) {
        throw ApiError.badRequest("Price must be a non-negative number");
      }
      updateData.price = price;
    }
    if (updates.compareAtPrice !== undefined) {
      if (updates.compareAtPrice === null) {
        updateData.compareAtPrice = null;
      } else {
        const cap = parseFloat(updates.compareAtPrice);
        if (isNaN(cap) || cap < 0) {
          throw ApiError.badRequest(
            "Compare at price must be a non-negative number"
          );
        }
        updateData.compareAtPrice = cap;
      }
    }
    if (updates.status !== undefined) {
      const validStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"];
      if (!validStatuses.includes(updates.status)) {
        throw ApiError.badRequest(
          `Status must be one of: ${validStatuses.join(", ")}`
        );
      }
      updateData.status = updates.status;
    }

    if (Object.keys(updateData).length === 0) {
      throw ApiError.badRequest(
        "At least one update field is required (price, compareAtPrice, status)"
      );
    }

    // Verify all products exist
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    if (existingProducts.length !== productIds.length) {
      const foundIds = new Set(existingProducts.map((p: { id: string }) => p.id));
      const missingIds = productIds.filter((id: string) => !foundIds.has(id));
      throw ApiError.badRequest(
        `Products not found: ${missingIds.join(", ")}`
      );
    }

    // Apply bulk update using updateMany
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        updatedCount: result.count,
      },
    });
  },
};
