/**
 * Shopify → Earth Revibe Migration Script
 *
 * Uses the Client Credentials Grant (OAuth 2.0) to obtain an access token
 * from client_id + client_secret, then fetches products, metafields, images,
 * variants, collections, and SEO tags via the GraphQL/REST Admin API.
 *
 * Usage:
 *   SHOPIFY_STORE_DOMAIN=xxx.myshopify.com \
 *   SHOPIFY_CLIENT_ID=xxx \
 *   SHOPIFY_CLIENT_SECRET=xxx \
 *   npx tsx apps/api/src/scripts/shopify-migrate.ts
 *
 * Or set these in apps/api/.env / apps/storefront/.env.local
 */

import { PrismaClient } from "@earth-revibe/db";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from the api app
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Also try .env.local from storefront (where user may have put Shopify creds)
dotenv.config({ path: path.resolve(__dirname, "../../../storefront/.env.local") });

// Fix DATABASE_URL if it has surrounding quotes (dotenv v17 doesn't strip them)
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim();
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DIRECT_URL.replace(/^["']|["']$/g, "").trim();
}

// Use DIRECT_URL for scripts to avoid PgBouncer "prepared statement already exists" errors
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
// Also support a direct access token if provided (legacy or manually obtained)
let SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || "";
const API_VERSION = "2024-10";

if (!SHOPIFY_DOMAIN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN environment variable");
  process.exit(1);
}

if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
  if (!SHOPIFY_TOKEN) {
    console.error(
      "Missing credentials. Provide either:\n" +
      "  - SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (recommended)\n" +
      "  - SHOPIFY_ACCESS_TOKEN (legacy)"
    );
    process.exit(1);
  }
}

const BASE_URL = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

// ─── Client Credentials Grant ────────────────────────────────

async function obtainAccessToken(): Promise<string> {
  if (SHOPIFY_TOKEN) {
    console.log("🔑 Using provided access token");
    return SHOPIFY_TOKEN;
  }

  console.log("🔑 Exchanging client credentials for access token...");

  const tokenUrl = `https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SHOPIFY_CLIENT_ID!,
      client_secret: SHOPIFY_CLIENT_SECRET!,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const token = data.access_token as string | undefined;

  if (!token) {
    throw new Error(`No access_token in response: ${JSON.stringify(data)}`);
  }

  console.log(
    `   ✅ Token obtained (expires in ${(data.expires_in as string) || "unknown"}s, scopes: ${(data.scope as string) || "unknown"})`
  );
  return token;
}

// ─── Shopify API Helpers ─────────────────────────────────────

async function shopifyFetch<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text} [${endpoint}]`);
  }

  return res.json() as Promise<T>;
}

async function shopifyFetchAll<T>(
  endpoint: string,
  key: string
): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = `${BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}limit=250`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API ${res.status}: ${text}`);
    }

    const data = (await res.json()) as Record<string, T[]>;
    all.push(...(data[key] || []));

    // Parse Link header for pagination
    const linkHeader = res.headers.get("link");
    url = null;
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
  }

  return all;
}

// ─── Shopify Types ───────────────────────────────────────────

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  product_type: string;
  status: string;
  tags: string;
  vendor: string;
  created_at: string;
  updated_at: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: ShopifyOption[];
}

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

interface ShopifyImage {
  id: number;
  src: string;
  alt: string | null;
  position: number;
}

interface ShopifyOption {
  name: string;
  values: string[];
}

interface ShopifyMetafield {
  id: number;
  namespace: string;
  key: string;
  value: string;
  type: string;
  owner_id: number;
  owner_resource: string;
}

interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  image?: { src: string } | null;
  sort_order: string;
}

interface ShopifyCollect {
  id: number;
  collection_id: number;
  product_id: number;
  position: number;
}

interface ShopifyPage {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  meta_title: string | null;
  meta_description: string | null;
}

interface ShopifyArticle {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  summary_html: string | null;
  author: string;
  tags: string;
  image?: { src: string } | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  metafields_global_title_tag?: string;
  metafields_global_description_tag?: string;
}

interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
}

// ─── Slugify ─────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Migration Functions ─────────────────────────────────────

async function migrateCollections() {
  console.log("\n📦 Fetching Shopify collections...");

  const customCollections = await shopifyFetchAll<ShopifyCollection>(
    "/custom_collections.json",
    "custom_collections"
  );
  const smartCollections = await shopifyFetchAll<ShopifyCollection>(
    "/smart_collections.json",
    "smart_collections"
  );
  const allCollections = [...customCollections, ...smartCollections];

  console.log(`   Found ${allCollections.length} collections`);

  const categoryMap = new Map<number, string>(); // shopify collection id → earth-revibe category id

  for (const col of allCollections) {
    const slug = col.handle || slugify(col.title);
    const existing = await prisma.category.findUnique({ where: { slug } });

    if (existing) {
      categoryMap.set(col.id, existing.id);
      console.log(`   ⏭️  Category "${col.title}" already exists, skipping`);
      continue;
    }

    const category = await prisma.category.create({
      data: {
        name: col.title,
        slug,
        description: col.body_html
          ? col.body_html.replace(/<[^>]+>/g, "").trim()
          : null,
        image: col.image?.src || null,
        isActive: true,
      },
    });

    categoryMap.set(col.id, category.id);
    console.log(`   ✅ Created category: ${col.title}`);
  }

  return categoryMap;
}

async function migrateProducts(categoryMap: Map<number, string>) {
  console.log("\n🛍️  Fetching Shopify products...");
  const products = await shopifyFetchAll<ShopifyProduct>(
    "/products.json",
    "products"
  );
  console.log(`   Found ${products.length} products`);

  // Fetch collects to map products → collections
  const collects = await shopifyFetchAll<ShopifyCollect>(
    "/collects.json",
    "collects"
  );
  const productCollectionMap = new Map<number, number>();
  for (const c of collects) {
    if (!productCollectionMap.has(c.product_id)) {
      productCollectionMap.set(c.product_id, c.collection_id);
    }
  }

  // Fetch default category as fallback
  let fallbackCategoryId: string | undefined;
  const firstCategory = await prisma.category.findFirst();
  if (firstCategory) fallbackCategoryId = firstCategory.id;

  const productIdMap = new Map<number, string>(); // shopify product id → earth-revibe product id
  let created = 0;
  let updated = 0;

  // Map Shopify status → Earth Revibe status
  const statusMap: Record<string, "DRAFT" | "ACTIVE" | "ARCHIVED"> = {
    active: "ACTIVE",
    draft: "DRAFT",
    archived: "ARCHIVED",
  };

  for (const product of products) {
    const slug = product.handle || slugify(product.title);
    const existing = await prisma.product.findUnique({ where: { slug } });

    const basePrice = product.variants[0]
      ? parseFloat(product.variants[0].price)
      : 0;
    const comparePrice = product.variants[0]?.compare_at_price
      ? parseFloat(product.variants[0].compare_at_price)
      : undefined;

    // Fetch metafields for this product
    let metafields: ShopifyMetafield[] = [];
    try {
      const mfData = await shopifyFetch<{ metafields: ShopifyMetafield[] }>(
        `/products/${product.id}/metafields.json`
      );
      metafields = mfData.metafields || [];
    } catch {
      // Metafields might not be accessible
    }

    // Extract useful metafield data
    let material: string | undefined;
    let careInstructions: string | undefined;
    let shortDescription: string | undefined;
    let seoTitle: string | undefined;
    let seoDescription: string | undefined;
    let returnsInfo: string | undefined;
    let shippingInfo: string | undefined;
    let origin: string | undefined;
    let composition: string | undefined;
    let measurements: string | undefined;
    let fabricWeight: string | undefined;
    let fit: string | undefined;
    let printType: string | undefined;
    let washInstructions: string | undefined;

    for (const mf of metafields) {
      const fullKey = `${mf.namespace}.${mf.key}`;
      const k = mf.key.toLowerCase();

      // SEO
      if (fullKey === "global.title_tag" || fullKey === "seo.title" || k === "title_tag") {
        seoTitle = mf.value;
      } else if (fullKey === "global.description_tag" || fullKey === "seo.description" || k === "description_tag") {
        seoDescription = mf.value;
      }
      // Material
      else if (k === "material" || k === "fabric") {
        material = mf.value;
      }
      // Composition
      else if (k === "composition" || k === "fabric_composition") {
        composition = mf.value;
      }
      // Care instructions
      else if (k === "care_instructions" || k === "care") {
        careInstructions = mf.value;
      }
      // Wash instructions
      else if (k === "wash_instructions" || k === "wash" || k === "washing_instructions") {
        washInstructions = mf.value;
      }
      // Fabric weight
      else if (k === "fabric_weight" || k === "weight" || k === "gsm" || k === "fabric-weight") {
        fabricWeight = mf.value;
      }
      // Fit
      else if (k === "fit" || k === "fit_type") {
        fit = mf.value;
      }
      // Measurements
      else if (k === "measurements" || k === "product_measurements" || k === "product-measurements") {
        measurements = mf.value;
      }
      // Print type
      else if (k === "print_type" || k === "print-type" || k === "print") {
        printType = mf.value;
      }
      // Origin
      else if (k === "origin" || k === "country_of_origin" || k === "made_in") {
        origin = mf.value;
      }
      // Returns info
      else if (k === "returns_info" || k === "returns" || k === "return_policy" || k === "returns-info") {
        returnsInfo = mf.value;
      }
      // Shipping info
      else if (k === "shipping_info" || k === "shipping" || k === "shipping-info" || k === "delivery") {
        shippingInfo = mf.value;
      }
      // Short description
      else if (k === "short_description" || k === "subtitle") {
        shortDescription = mf.value;
      }
    }

    // Log all metafields for visibility
    if (metafields.length > 0) {
      console.log(
        `   📋 Product "${product.title}" has ${metafields.length} metafields:`
      );
      for (const mf of metafields) {
        console.log(
          `      - ${mf.namespace}.${mf.key} (${mf.type}) = ${mf.value.substring(0, 80)}${mf.value.length > 80 ? "..." : ""}`
        );
      }
    }

    const description = product.body_html
      ? product.body_html.replace(/<[^>]+>/g, "").trim()
      : product.title;

    // Metafield data to write (used for both create and update)
    const metafieldData = {
      material: material || null,
      careInstructions: careInstructions || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      returnsInfo: returnsInfo || null,
      shippingInfo: shippingInfo || null,
      origin: origin || null,
      composition: composition || null,
      measurements: measurements || null,
      fabricWeight: fabricWeight || null,
      fit: fit || null,
      printType: printType || null,
      washInstructions: washInstructions || null,
    };

    if (existing) {
      // ── Update existing product with metafields ──────
      await prisma.product.update({
        where: { id: existing.id },
        data: metafieldData,
      });
      productIdMap.set(product.id, existing.id);
      updated++;
      console.log(
        `   🔄 Updated metafields: ${product.title} (${metafields.length} metafields)`
      );

      // Also sync tags for existing products
      if (product.tags) {
        const tagNames = product.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
        for (const tagName of tagNames) {
          const tagSlug = slugify(tagName);
          if (!tagSlug) continue;
          let tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
          if (!tag) {
            tag = await prisma.tag.create({ data: { name: tagName, slug: tagSlug } });
          }
          await prisma.productTag.create({
            data: { productId: existing.id, tagId: tag.id },
          }).catch(() => { /* duplicate */ });
        }
      }

      continue;
    }

    // ── Create new product ─────────────────────────────
    // Resolve category
    const collectionId = productCollectionMap.get(product.id);
    let categoryId =
      (collectionId ? categoryMap.get(collectionId) : undefined) ||
      fallbackCategoryId;

    if (!categoryId) {
      const defaultCat = await prisma.category.create({
        data: { name: "Uncategorized", slug: "uncategorized", isActive: true },
      });
      fallbackCategoryId = defaultCat.id;
      categoryId = defaultCat.id;
    }

    const dbProduct = await prisma.product.create({
      data: {
        name: product.title,
        slug,
        description: description || product.title,
        shortDescription: shortDescription || null,
        price: basePrice,
        compareAtPrice: comparePrice,
        ...metafieldData,
        status: statusMap[product.status] || "DRAFT",
        categoryId,
      },
    });

    productIdMap.set(product.id, dbProduct.id);

    // ── Import images ────────────────────────────────────
    for (let idx = 0; idx < product.images.length; idx++) {
      const img = product.images[idx];
      await prisma.productImage.create({
        data: {
          productId: dbProduct.id,
          url: img.src,
          publicId: `shopify-${img.id}`,
          altText: img.alt || product.title,
          sortOrder: img.position || idx,
          isPrimary: idx === 0,
        },
      });
    }

    // ── Import variants ──────────────────────────────────
    const sizeOptionIdx = product.options.findIndex(
      (o) =>
        o.name.toLowerCase() === "size" || o.name.toLowerCase() === "taille"
    );
    const colorOptionIdx = product.options.findIndex(
      (o) =>
        o.name.toLowerCase() === "color" ||
        o.name.toLowerCase() === "colour" ||
        o.name.toLowerCase() === "couleur"
    );

    for (const variant of product.variants) {
      const size =
        sizeOptionIdx >= 0
          ? [variant.option1, variant.option2, variant.option3][sizeOptionIdx] ||
            "One Size"
          : variant.option1 || "One Size";

      const color =
        colorOptionIdx >= 0
          ? [variant.option1, variant.option2, variant.option3][
              colorOptionIdx
            ] || "Default"
          : variant.option2 || "Default";

      const sku = variant.sku || `${slug}-${size}-${color}`.toLowerCase().replace(/\s+/g, "-");

      const existingSku = await prisma.productVariant.findUnique({
        where: { sku },
      });
      if (existingSku) continue;

      const variantPrice = parseFloat(variant.price);
      const priceOverride =
        variantPrice !== basePrice ? variantPrice : undefined;

      await prisma.productVariant.create({
        data: {
          productId: dbProduct.id,
          sku,
          size,
          color,
          price: priceOverride,
          stock: Math.max(variant.inventory_quantity || 0, 0),
          isActive: true,
        },
      });
    }

    // ── Import tags ──────────────────────────────────────
    if (product.tags) {
      const tagNames = product.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);

      for (const tagName of tagNames) {
        const tagSlug = slugify(tagName);
        if (!tagSlug) continue;

        let tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName, slug: tagSlug },
          });
        }

        await prisma.productTag
          .create({
            data: { productId: dbProduct.id, tagId: tag.id },
          })
          .catch(() => {
            // Ignore duplicate
          });
      }
    }

    created++;
    console.log(
      `   ✅ Imported: ${product.title} (${product.variants.length} variants, ${product.images.length} images)`
    );
  }

  console.log(`\n   📊 Products: ${created} created, ${updated} updated with metafields`);
  return productIdMap;
}

async function migrateBlog() {
  console.log("\n📝 Fetching Shopify blog posts...");

  let blogs: ShopifyBlog[] = [];
  try {
    blogs = await shopifyFetchAll<ShopifyBlog>("/blogs.json", "blogs");
  } catch {
    console.log("   No blog access or no blogs found");
    return;
  }

  if (blogs.length === 0) {
    console.log("   No blogs found");
    return;
  }

  let totalArticles = 0;

  for (const blog of blogs) {
    console.log(`   Blog: "${blog.title}"`);

    const articles = await shopifyFetchAll<ShopifyArticle>(
      `/blogs/${blog.id}/articles.json`,
      "articles"
    );

    for (const article of articles) {
      const slug = article.handle || slugify(article.title);
      const existing = await prisma.blogPost.findUnique({ where: { slug } });

      if (existing) {
        console.log(`   ⏭️  Article "${article.title}" already exists`);
        continue;
      }

      const content = article.body_html || "";
      const excerpt =
        article.summary_html?.replace(/<[^>]+>/g, "").trim() ||
        content.replace(/<[^>]+>/g, "").substring(0, 200);

      // Fetch article metafields for SEO
      let metaTitle: string | null = null;
      let metaDescription: string | null = null;

      try {
        const mfData = await shopifyFetch<{ metafields: ShopifyMetafield[] }>(
          `/blogs/${blog.id}/articles/${article.id}/metafields.json`
        );
        for (const mf of mfData.metafields || []) {
          if (mf.key === "title_tag" || mf.key === "seo_title") {
            metaTitle = mf.value;
          }
          if (mf.key === "description_tag" || mf.key === "seo_description") {
            metaDescription = mf.value;
          }
        }
      } catch {
        // Fall back to global meta tags
        metaTitle = article.metafields_global_title_tag || null;
        metaDescription = article.metafields_global_description_tag || null;
      }

      const wordCount = content.replace(/<[^>]+>/g, "").split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));

      await prisma.blogPost.create({
        data: {
          title: article.title,
          slug,
          excerpt,
          content,
          featuredImage: article.image?.src || null,
          authorId: "system", // Will need manual mapping
          status: article.published_at ? "PUBLISHED" : "DRAFT",
          publishedAt: article.published_at
            ? new Date(article.published_at)
            : null,
          metaTitle,
          metaDescription,
          readTime,
        },
      });

      // Import article tags
      if (article.tags) {
        const tagNames = article.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);

        for (const tagName of tagNames) {
          const tagSlug = slugify(tagName);
          if (!tagSlug) continue;

          let tag = await prisma.blogTag.findUnique({
            where: { slug: tagSlug },
          });
          if (!tag) {
            tag = await prisma.blogTag.create({
              data: { name: tagName, slug: tagSlug },
            });
          }
        }
      }

      totalArticles++;
      console.log(`   ✅ Imported article: ${article.title}`);
    }
  }

  console.log(`   📊 Total blog articles imported: ${totalArticles}`);
}

async function fetchAndLogAllMetafields() {
  console.log("\n🔍 Fetching store-level metafields...");

  try {
    const data = await shopifyFetch<{ metafields: ShopifyMetafield[] }>(
      "/metafields.json"
    );

    if (data.metafields.length === 0) {
      console.log("   No store-level metafields found");
    } else {
      console.log(
        `   Found ${data.metafields.length} store-level metafields:`
      );
      for (const mf of data.metafields) {
        console.log(
          `   - ${mf.namespace}.${mf.key} (${mf.type}) = ${mf.value.substring(0, 100)}`
        );
      }
    }
  } catch (err) {
    console.log(`   Could not fetch store metafields: ${err}`);
  }
}

async function fetchPages() {
  console.log("\n📄 Fetching Shopify pages...");

  try {
    const pages = await shopifyFetchAll<ShopifyPage>("/pages.json", "pages");
    console.log(`   Found ${pages.length} pages:`);

    for (const page of pages) {
      console.log(`   - "${page.title}" (/${page.handle})`);
      if (page.meta_title) console.log(`     Meta title: ${page.meta_title}`);
      if (page.meta_description)
        console.log(
          `     Meta desc: ${page.meta_description.substring(0, 100)}`
        );

      // Fetch page metafields
      try {
        const mfData = await shopifyFetch<{ metafields: ShopifyMetafield[] }>(
          `/pages/${page.id}/metafields.json`
        );
        if (mfData.metafields.length > 0) {
          console.log(`     Metafields:`);
          for (const mf of mfData.metafields) {
            console.log(
              `       ${mf.namespace}.${mf.key} = ${mf.value.substring(0, 80)}`
            );
          }
        }
      } catch {
        // Not all pages may have metafield access
      }
    }
  } catch (err) {
    console.log(`   Could not fetch pages: ${err}`);
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Shopify → Earth Revibe Migration");
  console.log(`  Store: ${SHOPIFY_DOMAIN}`);
  console.log("═══════════════════════════════════════════════════════");

  try {
    // Step 0: Obtain access token via Client Credentials Grant
    SHOPIFY_TOKEN = await obtainAccessToken();

    // Step 1: Log all store metafields for visibility
    await fetchAndLogAllMetafields();

    // Step 2: Migrate collections → categories
    const categoryMap = await migrateCollections();

    // Step 3: Migrate products + variants + images + tags + metafields
    await migrateProducts(categoryMap);

    // Step 4: Migrate blog articles
    await migrateBlog();

    // Step 5: Fetch and log pages (for manual review)
    await fetchPages();

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  Migration complete!");
    console.log("═══════════════════════════════════════════════════════");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
