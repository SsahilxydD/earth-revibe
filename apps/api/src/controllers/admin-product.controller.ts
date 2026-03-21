import type { Request, Response } from "express";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import { productService } from "../services/product.service";

// ─── CSV helpers ───────────────────────────────────────────────

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** RFC-4180 compliant CSV line parser — handles quoted fields with commas, newlines, escaped quotes */
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
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse full CSV text into rows, correctly handling multi-line quoted fields.
 * Returns array of string arrays (one per row, including the header row).
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
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
        current += '"';
      } else if (char === "\r") {
        // skip \r
      } else if (char === "\n") {
        if (current.trim().length > 0) {
          rows.push(parseCSVLine(current));
        }
        current = "";
      } else {
        current += char;
      }
    }
  }
  if (current.trim().length > 0) {
    rows.push(parseCSVLine(current));
  }
  return rows;
}

// ─── Shopify column name → our DB field mapping ────────────────

/** Map from lowercase Shopify CSV header to our Product model field name */
const SHOPIFY_PRODUCT_FIELD_MAP: Record<string, string> = {
  "handle": "slug",
  "title": "name",
  "body (html)": "description",
  "seo title": "seoTitle",
  "seo description": "seoDescription",
  "seo keywords": "seoKeywords",
  "status": "status",
  // Custom metafields (with display name prefix)
  "composition (product.metafields.custom.composition)": "composition",
  "fabric weight (product.metafields.custom.fabric_weight)": "fabricWeight",
  "fit (product.metafields.custom.fit)": "fit",
  "origin (product.metafields.custom.origin)": "origin",
  "print type (product.metafields.custom.print_type)": "printType",
  "product measurements (product.metafields.custom.product_measurements)": "measurements",
  "returns info (product.metafields.custom.returns_info)": "returnsInfo",
  "shipping info (product.metafields.custom.shipping_info)": "shippingInfo",
  "wash instructions (product.metafields.custom.wash_instructions)": "washInstructions",
  "material (product.metafields.custom.material)": "material",
  "care instructions (product.metafields.custom.care_instructions)": "careInstructions",
  // Also accept bare metafield keys
  "product.metafields.custom.composition": "composition",
  "product.metafields.custom.fabric_weight": "fabricWeight",
  "product.metafields.custom.fit": "fit",
  "product.metafields.custom.origin": "origin",
  "product.metafields.custom.print_type": "printType",
  "product.metafields.custom.product_measurements": "measurements",
  "product.metafields.custom.returns_info": "returnsInfo",
  "product.metafields.custom.shipping_info": "shippingInfo",
  "product.metafields.custom.wash_instructions": "washInstructions",
  "product.metafields.custom.material": "material",
  "product.metafields.custom.care_instructions": "careInstructions",
  // Shopify standard metafields — only map fit (others not stored)
  "fit (product.metafields.shopify.fit)": "fit",
  "product.metafields.shopify.fit": "fit",
};

/** Fields that go directly onto the Product model */
const PRODUCT_DB_FIELDS = new Set([
  "name", "slug", "description", "seoTitle", "seoDescription", "seoKeywords",
  "composition", "fabricWeight", "fit", "origin", "printType", "measurements",
  "returnsInfo", "shippingInfo", "washInstructions", "material", "careInstructions",
]);

// ─── Grouped product type ──────────────────────────────────────

interface ShopifyProductGroup {
  handle: string;
  productData: Record<string, string>;
  variants: Record<string, string>[];
  images: { src: string; position: number; altText: string }[];
  tags: string[];
  rows: number[];  // original row numbers for error reporting
}

// ─── Controller ────────────────────────────────────────────────

export const adminProductController = {
  async listProducts(req: Request, res: Response) {
    const result = await productService.listProducts(
      res.locals.validatedQuery || req.query,
      true // adminMode — show all statuses by default
    );
    res.json({ success: true, data: result });
  },

  async getProduct(req: Request, res: Response) {
    const product = await productService.getProductBySlug(
      req.params.slug as string,
      true // includeAll — show inactive variants too
    );
    res.json({ success: true, data: product });
  },

  // ═══════════════════════════════════════════
  // EXPORT CSV — Shopify-compatible format
  // ═══════════════════════════════════════════

  async exportCSV(_req: Request, res: Response) {
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type", "Tags",
      "Published", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
      "Option3 Name", "Option3 Value", "Variant SKU", "Variant Grams",
      "Variant Inventory Tracker", "Variant Inventory Qty", "Variant Inventory Policy",
      "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
      "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
      "Image Src", "Image Position", "Image Alt Text", "Gift Card",
      "SEO Title", "SEO Description", "SEO Keywords",
      "Composition (product.metafields.custom.composition)",
      "Fabric Weight (product.metafields.custom.fabric_weight)",
      "Fit (product.metafields.custom.fit)",
      "Origin (product.metafields.custom.origin)",
      "Print Type (product.metafields.custom.print_type)",
      "Product Measurements (product.metafields.custom.product_measurements)",
      "Returns Info (product.metafields.custom.returns_info)",
      "Shipping Info (product.metafields.custom.shipping_info)",
      "Wash Instructions (product.metafields.custom.wash_instructions)",
      "Material (product.metafields.custom.material)",
      "Care Instructions (product.metafields.custom.care_instructions)",
      "Variant Image", "Variant Weight Unit", "Variant Tax Code", "Cost per item",
      "Status",
    ];

    const rows: string[] = [];

    for (const product of products) {
      const tags = product.tags.map((pt: any) => pt.tag.name).join(", ");
      const published = product.status === "ACTIVE" ? "true" : "false";
      const statusStr = product.status.toLowerCase();

      // Determine max rows needed (variants vs images)
      const variantCount = product.variants.length || 1;
      const imageCount = product.images.length;
      const totalRows = Math.max(variantCount, imageCount);

      for (let i = 0; i < totalRows; i++) {
        const variant = product.variants[i];
        const image = product.images[i];
        const isFirstRow = i === 0;

        const row = [
          escapeCSV(product.slug),                                   // Handle
          isFirstRow ? escapeCSV(product.name) : "",                 // Title
          isFirstRow ? escapeCSV(product.description) : "",          // Body (HTML)
          "",                                                        // Vendor
          isFirstRow ? escapeCSV(product.category?.name) : "",       // Product Category
          "",                                                        // Type
          isFirstRow ? escapeCSV(tags) : "",                         // Tags
          isFirstRow ? published : "",                               // Published
          variant ? "Size" : "",                                     // Option1 Name
          variant ? escapeCSV(variant.size) : "",                    // Option1 Value
          variant && variant.color ? "Color" : "",                   // Option2 Name
          variant ? escapeCSV(variant.color) : "",                   // Option2 Value
          "",                                                        // Option3 Name
          "",                                                        // Option3 Value
          variant ? escapeCSV(variant.sku) : "",                     // Variant SKU
          variant && variant.weight ? String(variant.weight) : "0",  // Variant Grams
          variant ? "shopify" : "",                                  // Variant Inventory Tracker
          variant ? String(variant.stock) : "",                      // Variant Inventory Qty
          variant ? "deny" : "",                                     // Variant Inventory Policy
          variant ? "manual" : "",                                   // Variant Fulfillment Service
          variant && variant.price ? String(variant.price) : (isFirstRow ? String(product.price) : ""), // Variant Price
          isFirstRow && product.compareAtPrice ? String(product.compareAtPrice) : "", // Variant Compare At Price
          variant ? "true" : "",                                     // Variant Requires Shipping
          variant ? "true" : "",                                     // Variant Taxable
          variant ? escapeCSV(variant.barcode) : "",                 // Variant Barcode
          image ? escapeCSV(image.url) : "",                         // Image Src
          image ? String(image.sortOrder + 1) : "",                  // Image Position
          image ? escapeCSV(image.altText) : "",                     // Image Alt Text
          isFirstRow ? "false" : "",                                 // Gift Card
          isFirstRow ? escapeCSV(product.seoTitle) : "",             // SEO Title
          isFirstRow ? escapeCSV(product.seoDescription) : "",       // SEO Description
          isFirstRow ? escapeCSV(product.seoKeywords) : "",            // SEO Keywords
          // Custom metafields
          isFirstRow ? escapeCSV(product.composition) : "",
          isFirstRow ? escapeCSV(product.fabricWeight) : "",
          isFirstRow ? escapeCSV(product.fit) : "",
          isFirstRow ? escapeCSV(product.origin) : "",
          isFirstRow ? escapeCSV(product.printType) : "",
          isFirstRow ? escapeCSV(product.measurements) : "",
          isFirstRow ? escapeCSV(product.returnsInfo) : "",
          isFirstRow ? escapeCSV(product.shippingInfo) : "",
          isFirstRow ? escapeCSV(product.washInstructions) : "",
          isFirstRow ? escapeCSV(product.material) : "",
          isFirstRow ? escapeCSV(product.careInstructions) : "",
          "",                                                        // Variant Image
          variant ? escapeCSV(variant.weightUnit || "g") : "",       // Variant Weight Unit
          "",                                                        // Variant Tax Code
          "",                                                        // Cost per item
          isFirstRow ? statusStr : "",                               // Status
        ];

        rows.push(row.join(","));
      }
    }

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="products-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.send(csv);
  },

  // ═══════════════════════════════════════════
  // IMPORT CSV — Shopify-compatible format
  // ═══════════════════════════════════════════

  async importCSV(req: Request, res: Response) {
    const body = typeof req.body === "string" ? req.body : req.body?.csv;
    if (!body || typeof body !== "string") {
      throw ApiError.badRequest(
        'CSV content is required. Send as { csv: "..." } in JSON body.'
      );
    }

    const allRows = parseCSV(body);
    if (allRows.length < 2) {
      throw ApiError.badRequest("CSV must contain a header row and at least one data row");
    }

    // ── Build header index ──
    const headerRow = allRows[0];
    const col: Record<string, number> = {};
    headerRow.forEach((h, i) => {
      col[h.toLowerCase().trim()] = i;
    });

    const get = (row: string[], header: string): string => {
      const idx = col[header.toLowerCase()];
      return idx !== undefined ? (row[idx] || "").trim() : "";
    };

    // Detect format: Shopify (has Handle column) vs legacy (has Name column)
    const isShopify = col["handle"] !== undefined;

    if (!isShopify) {
      // Legacy format — require name, slug, price, status
      return this._importLegacyCSV(allRows, col, res);
    }

    // ── Group rows by Handle ──
    const groups = new Map<string, ShopifyProductGroup>();

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const handle = get(row, "handle");
      if (!handle) continue;

      if (!groups.has(handle)) {
        // First row for this handle — extract product-level data
        const productData: Record<string, string> = {};

        // Map known Shopify headers to our field names
        for (const [shopifyHeader, dbField] of Object.entries(SHOPIFY_PRODUCT_FIELD_MAP)) {
          const value = get(row, shopifyHeader);
          if (value && PRODUCT_DB_FIELDS.has(dbField)) {
            productData[dbField] = value;
          }
        }

        // Ensure handle→slug mapping
        productData.slug = handle;

        // Title → name
        const title = get(row, "title");
        if (title) productData.name = title;

        // Body (HTML) → description
        const body = get(row, "body (html)");
        if (body) productData.description = body;

        // Tags
        const tagsStr = get(row, "tags");
        const tags = tagsStr
          ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        // Price from first variant row (used as product base price)
        const variantPrice = get(row, "variant price");
        if (variantPrice) productData.__price__ = variantPrice;

        const compareAt = get(row, "variant compare at price");
        if (compareAt) productData.__compareAtPrice__ = compareAt;

        // SEO
        const seoTitle = get(row, "seo title");
        if (seoTitle) productData.seoTitle = seoTitle;
        const seoDesc = get(row, "seo description");
        if (seoDesc) productData.seoDescription = seoDesc;

        // Status
        const status = get(row, "status");
        if (status) productData.__status__ = status;

        // Product category (Shopify taxonomy)
        const category = get(row, "product category");
        if (category) productData.__category__ = category;

        groups.set(handle, {
          handle,
          productData,
          variants: [],
          images: [],
          tags,
          rows: [i + 1],
        });
      } else {
        groups.get(handle)!.rows.push(i + 1);
      }

      const group = groups.get(handle)!;

      // ── Extract variant data (if this row has a SKU or option value) ──
      const sku = get(row, "variant sku");
      const option1Value = get(row, "option1 value");
      const option2Value = get(row, "option2 value");
      const option3Value = get(row, "option3 value");

      if (sku || option1Value) {
        const variantData: Record<string, string> = {};
        if (sku) variantData.sku = sku;

        // Map options — Option1 is typically Size, Option2 is Color
        const option1Name = get(row, "option1 name").toLowerCase();
        const option2Name = get(row, "option2 name").toLowerCase();

        // Determine size and color from options
        if (option1Name.includes("size") || option1Name === "size") {
          variantData.size = option1Value;
        } else if (option1Name.includes("color") || option1Name === "color") {
          variantData.color = option1Value;
        } else if (option1Name === "title" && option1Value === "Default Title") {
          variantData.size = "ONE SIZE";
        } else if (option1Value) {
          // Default: first option → size
          variantData.size = option1Value;
        }

        if (option2Name.includes("color") || option2Name === "color") {
          variantData.color = option2Value;
        } else if (option2Name.includes("size") || option2Name === "size") {
          variantData.size = option2Value;
        } else if (option2Value) {
          variantData.color = option2Value;
        }

        // If we have Option3, store it in color as additional info
        if (option3Value && !variantData.color) {
          variantData.color = option3Value;
        }

        // Variant price, stock, etc.
        const vPrice = get(row, "variant price");
        if (vPrice) variantData.price = vPrice;

        const vCompare = get(row, "variant compare at price");
        if (vCompare) variantData.compareAtPrice = vCompare;

        const vStock = get(row, "variant inventory qty");
        if (vStock) variantData.stock = vStock;

        const vBarcode = get(row, "variant barcode");
        if (vBarcode) variantData.barcode = vBarcode;

        const vGrams = get(row, "variant grams");
        if (vGrams) variantData.weight = vGrams;

        const vWeightUnit = get(row, "variant weight unit");
        if (vWeightUnit) variantData.weightUnit = vWeightUnit;

        group.variants.push(variantData);
      }

      // ── Extract image data ──
      const imgSrc = get(row, "image src");
      if (imgSrc) {
        const imgPos = get(row, "image position");
        const imgAlt = get(row, "image alt text");
        group.images.push({
          src: imgSrc,
          position: imgPos ? parseInt(imgPos, 10) : group.images.length + 1,
          altText: imgAlt || "",
        });
      }
    }

    // ── Process each product group ──
    const categories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>();
    for (const c of categories) {
      categoryMap.set(c.name.toLowerCase(), c.id);
      // Also map by slug
      categoryMap.set(c.slug.toLowerCase(), c.id);
    }
    // Map Shopify taxonomy segments to our categories
    // e.g. "Apparel & Accessories > Clothing > Clothing Tops > T-Shirts" → try "t-shirts", "clothing tops", etc.

    const created: string[] = [];
    const updated: string[] = [];
    const errors: { row: number; message: string }[] = [];

    for (const [, group] of groups) {
      try {
        const pd = group.productData;
        const name = pd.name || group.handle;
        const slug = pd.slug || group.handle;
        const description = pd.description || name;

        // Resolve status
        const statusRaw = (pd.__status__ || "active").toLowerCase();
        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          draft: "DRAFT",
          archived: "ARCHIVED",
        };
        const status = statusMap[statusRaw] || "DRAFT";

        // Resolve category from Shopify taxonomy path
        let categoryId: string | undefined;
        if (pd.__category__) {
          // Try matching each segment of the taxonomy path, from most specific to least
          const segments = pd.__category__.split(">").map((s) => s.trim());
          for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i].toLowerCase();
            categoryId = categoryMap.get(seg);
            if (categoryId) break;
            // Also try slug form
            const slugForm = seg.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            categoryId = categoryMap.get(slugForm);
            if (categoryId) break;
          }
        }
        // Fallback to first category
        if (!categoryId) {
          const first = categories[0];
          if (!first) {
            errors.push({ row: group.rows[0], message: "No category available" });
            continue;
          }
          categoryId = first.id;
        }

        // Price from first variant or product data
        const priceStr = pd.__price__ || group.variants[0]?.price || "0";
        const price = parseFloat(priceStr);
        if (isNaN(price)) {
          errors.push({ row: group.rows[0], message: `Invalid price: ${priceStr}` });
          continue;
        }

        const compareAtPriceStr = pd.__compareAtPrice__;
        const compareAtPrice = compareAtPriceStr ? parseFloat(compareAtPriceStr) : undefined;

        // Build product data object
        const productFields: Record<string, unknown> = {
          name,
          slug,
          description,
          price,
          status,
          categoryId,
        };

        if (compareAtPrice && !isNaN(compareAtPrice)) {
          productFields.compareAtPrice = compareAtPrice;
        }

        // Map all metafields / product-level fields
        for (const field of PRODUCT_DB_FIELDS) {
          if (pd[field] && field !== "name" && field !== "slug" && field !== "description") {
            productFields[field] = pd[field];
          }
        }

        // Check for existing product
        const existing = await prisma.product.findUnique({
          where: { slug },
          include: { variants: true, images: true },
        });

        let productId: string;

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: productFields as any,
          });
          productId = existing.id;
          updated.push(name);
        } else {
          const newProduct = await prisma.product.create({
            data: productFields as any,
          });
          productId = newProduct.id;
          created.push(name);
        }

        // ── Upsert tags ──
        if (group.tags.length > 0) {
          for (const tagName of group.tags) {
            const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            if (!tagSlug) continue;

            let tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
            if (!tag) {
              tag = await prisma.tag.create({ data: { name: tagName, slug: tagSlug } });
            }

            // Connect to product (ignore if already connected)
            await prisma.productTag.upsert({
              where: { productId_tagId: { productId, tagId: tag.id } },
              create: { productId, tagId: tag.id },
              update: {},
            });
          }
        }

        // ── Upsert variants ──
        if (group.variants.length > 0) {
          for (const v of group.variants) {
            if (!v.sku) continue;

            const size = v.size || "ONE SIZE";
            const color = v.color || "";
            const vPrice = v.price ? parseFloat(v.price) : undefined;
            const stock = v.stock ? parseInt(v.stock, 10) : 0;
            const weight = v.weight ? parseFloat(v.weight) : undefined;
            const weightUnit = v.weightUnit || "g";

            const existingVariant = await prisma.productVariant.findUnique({
              where: { sku: v.sku },
            });

            if (existingVariant) {
              await prisma.productVariant.update({
                where: { id: existingVariant.id },
                data: {
                  size,
                  color,
                  price: vPrice,
                  stock,
                  barcode: v.barcode || null,
                  weight: weight || null,
                  weightUnit,
                },
              });
            } else {
              await prisma.productVariant.create({
                data: {
                  productId,
                  sku: v.sku,
                  size,
                  color,
                  price: vPrice,
                  stock,
                  barcode: v.barcode || null,
                  weight: weight || null,
                  weightUnit,
                },
              });
            }
          }
        }

        // ── Upsert images ──
        if (group.images.length > 0) {
          // Get existing image URLs for this product to avoid duplicates
          const existingImages = existing?.images || [];
          const existingUrls = new Set(existingImages.map((img) => img.url));

          for (let imgIdx = 0; imgIdx < group.images.length; imgIdx++) {
            const img = group.images[imgIdx];
            if (existingUrls.has(img.src)) continue;

            await prisma.productImage.create({
              data: {
                productId,
                url: img.src,
                publicId: "",
                altText: img.altText || null,
                sortOrder: img.position - 1,
                isPrimary: img.position === 1 && existingImages.length === 0,
              },
            });
          }
        }
      } catch (err: unknown) {
        errors.push({
          row: group.rows[0],
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

  /** Legacy CSV format (name, slug, price, status, category, compare at price) */
  async _importLegacyCSV(
    allRows: string[][],
    col: Record<string, number>,
    res: Response
  ) {
    const get = (row: string[], header: string): string => {
      const idx = col[header.toLowerCase()];
      return idx !== undefined ? (row[idx] || "").trim() : "";
    };

    const requiredColumns = ["name", "slug", "price", "status"];
    for (const c of requiredColumns) {
      if (col[c] === undefined) {
        throw ApiError.badRequest(`Missing required CSV column: ${c}`);
      }
    }

    const categories = await prisma.category.findMany();
    const categoryMap = new Map<string, string>(
      categories.map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id])
    );

    const created: string[] = [];
    const updated: string[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < allRows.length; i++) {
      try {
        const row = allRows[i];
        const name = get(row, "name");
        const slug = get(row, "slug") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const priceStr = get(row, "price");
        const compareAtPriceStr = get(row, "compare at price");
        const categoryName = get(row, "category");
        const status = get(row, "status") || "DRAFT";

        if (!name || !priceStr) {
          errors.push({ row: i + 1, message: "Name and Price are required" });
          continue;
        }

        const price = parseFloat(priceStr);
        if (isNaN(price)) {
          errors.push({ row: i + 1, message: `Invalid price: ${priceStr}` });
          continue;
        }

        const compareAtPrice = compareAtPriceStr ? parseFloat(compareAtPriceStr) : undefined;

        let categoryId: string | undefined;
        if (categoryName) {
          categoryId = categoryMap.get(categoryName.toLowerCase());
          if (!categoryId) {
            errors.push({ row: i + 1, message: `Category not found: ${categoryName}` });
            continue;
          }
        }

        const validStatuses = ["ACTIVE", "DRAFT", "ARCHIVED"];
        if (!validStatuses.includes(status.toUpperCase())) {
          errors.push({ row: i + 1, message: `Invalid status: ${status}` });
          continue;
        }

        const existing = await prisma.product.findUnique({ where: { slug } });

        if (existing) {
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
          await prisma.product.update({ where: { id: existing.id }, data: updateData });
          updated.push(name);
        } else {
          if (!categoryId) {
            const first = categories[0];
            if (!first) {
              errors.push({ row: i + 1, message: "No category available for new product" });
              continue;
            }
            categoryId = first.id;
          }
          await prisma.product.create({
            data: {
              name,
              slug,
              description: name,
              price,
              compareAtPrice: compareAtPrice !== undefined && !isNaN(compareAtPrice) ? compareAtPrice : undefined,
              status: status.toUpperCase() as "DRAFT" | "ACTIVE" | "ARCHIVED",
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
