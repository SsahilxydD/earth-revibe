import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Simple CSV parser that handles quoted fields with commas
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field);
        field = '';
        if (current.length > 1) lines.push(current);
        current = [];
        if (ch === '\r') i++;
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length) {
    current.push(field);
    if (current.length > 1) lines.push(current);
  }

  const headers = lines[0];
  return lines.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (row[i] || '').trim();
    });
    return obj;
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCategoryInfo(productCategory: string): { name: string; slug: string } {
  const parts = productCategory.split('>').map((p) => p.trim());
  const last = parts[parts.length - 1] || 'Uncategorized';

  const map: Record<string, { name: string; slug: string }> = {
    Shirts: { name: 'Shirts', slug: 'shirts' },
    'T-Shirts': { name: 'T-Shirts', slug: 't-shirts' },
    Polos: { name: 'Polos', slug: 'polos' },
    'Cargo Pants': { name: 'Cargo Pants', slug: 'cargo-pants' },
    Trousers: { name: 'Trousers', slug: 'trousers' },
    'Coats & Jackets': { name: 'Outerwear', slug: 'outerwear' },
  };

  return map[last] || { name: last, slug: last.toLowerCase().replace(/\s+/g, '-') };
}

const COLOR_MAP: Record<string, { name: string; hex: string }> = {
  'marine-folklore': { name: 'Teal', hex: '#008080' },
  'vintage-herbarium-shirt': { name: 'Cream', hex: '#FFFDD0' },
  'a-to-a-maroon-graphic-tee': { name: 'Maroon', hex: '#800000' },
  'black-twill-straight-fit-cargo-pants': { name: 'Black', hex: '#000000' },
  'plain-blue-word-hunt-boxy-tee': { name: 'Blue', hex: '#4169E1' },
  'grey-contrast-stitch-puff-print-boxy-tee': { name: 'Grey', hex: '#808080' },
  'herbal-cotton-contrast-collar-branding-polo': { name: 'Beige', hex: '#F5F5DC' },
  'herbal-white-all-over-print-boxy-tee': { name: 'White', hex: '#FFFFFF' },
  'skin-conscious-embroidered-collar-boxy-shirt': { name: 'Pink Beige', hex: '#E8C4B8' },
  'twill-off-white-cotton-formal-trousers': { name: 'Off White', hex: '#FAF0E6' },
  'water-color-wave-graphic-boxy-tee': { name: 'Blue', hex: '#4682B4' },
  'cream-twill-all-over-star-print-boxy-shirt': { name: 'Cream', hex: '#FFFDD0' },
  'contrast-oversized-polo-with-unique-collar-branding': { name: 'White', hex: '#FFFFFF' },
  'green-twill-bellbottom-utility-pants': { name: 'Green', hex: '#556B2F' },
  'all-over-print-formal-boxy-polo': { name: 'Green', hex: '#2E8B57' },
  'cream-cotton-puff-print-boxy-tee': { name: 'Cream', hex: '#FFFDD0' },
  'olive-herbal-cotton-reflective-boxy-tee': { name: 'Olive', hex: '#808000' },
  'khakhi-shadow-twill-block-print-shacket': { name: 'Khaki', hex: '#C3B091' },
  'two-panel-minimal-branding-boxy-tee': { name: 'Navy', hex: '#000080' },
  'vintage-print-twill-straight-fit-pants': { name: 'Beige', hex: '#F5F5DC' },
  'blu-skin-cotton-oversized-stripe-boxy-fit-shirt': { name: 'Blue Stripe', hex: '#6495ED' },
  'aqua-blue-twill-cactus-printed-shacket': { name: 'Aqua Blue', hex: '#00CED1' },
  'white-black-twill-zipper-shacket': { name: 'White & Black', hex: '#F0F0F0' },
};

interface ProductData {
  handle: string;
  title: string;
  bodyHtml: string;
  category: string;
  price: number;
  material: string;
  careInstructions: string;
  washInstructions: string;
  composition: string;
  fabricWeight: string;
  fit: string;
  origin: string;
  printType: string;
  measurements: string;
  returnsInfo: string;
  shippingInfo: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  tags: string;
  variants: { sku: string; size: string; stock: number; price: number }[];
  images: { url: string; position: number; altText: string }[];
}

async function main() {
  console.log('=== Earth Revibe Database Seed ===\n');

  // Parse CSV
  const csvPath = path.resolve(__dirname, '../../../products_export_1.csv');
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`Parsed ${rows.length} CSV rows`);

  // Group rows by product handle
  const productMap = new Map<string, ProductData>();

  for (const row of rows) {
    const handle = row['Handle'];
    if (!handle) continue;

    if (!productMap.has(handle)) {
      productMap.set(handle, {
        handle,
        title: row['Title'] || '',
        bodyHtml: row['Body (HTML)'] || '',
        category: row['Product Category'] || '',
        price: parseFloat(row['Variant Price']) || 0,
        material: row['Material (product.metafields.custom.material)'] || '',
        careInstructions:
          row['Care Instructions (product.metafields.custom.care_instructions)'] || '',
        washInstructions:
          row['Wash Instructions (product.metafields.custom.wash_instructions)'] || '',
        composition: row['Composition (product.metafields.custom.composition)'] || '',
        fabricWeight: row['Fabric Weight (product.metafields.custom.fabric_weight)'] || '',
        fit: row['Fit (product.metafields.custom.fit)'] || '',
        origin: row['Origin (product.metafields.custom.origin)'] || '',
        printType: row['Print Type (product.metafields.custom.print_type)'] || '',
        measurements:
          row['Product Measurements (product.metafields.custom.product_measurements)'] || '',
        returnsInfo: row['Returns Info (product.metafields.custom.returns_info)'] || '',
        shippingInfo: row['Shipping Info (product.metafields.custom.shipping_info)'] || '',
        seoTitle: row['SEO Title'] || '',
        seoDescription: row['SEO Description'] || '',
        seoKeywords: row['SEO Keywords'] || '',
        tags: row['Tags'] || '',
        variants: [],
        images: [],
      });
    }

    const product = productMap.get(handle)!;

    // Fill product details from first row with Title
    if (row['Title'] && !product.title) {
      product.title = row['Title'];
      product.bodyHtml = row['Body (HTML)'] || '';
      product.category = row['Product Category'] || '';
      product.material = row['Material (product.metafields.custom.material)'] || '';
      product.careInstructions =
        row['Care Instructions (product.metafields.custom.care_instructions)'] || '';
      product.washInstructions =
        row['Wash Instructions (product.metafields.custom.wash_instructions)'] || '';
      product.composition = row['Composition (product.metafields.custom.composition)'] || '';
      product.fabricWeight = row['Fabric Weight (product.metafields.custom.fabric_weight)'] || '';
      product.fit = row['Fit (product.metafields.custom.fit)'] || '';
      product.origin = row['Origin (product.metafields.custom.origin)'] || '';
      product.printType = row['Print Type (product.metafields.custom.print_type)'] || '';
      product.measurements =
        row['Product Measurements (product.metafields.custom.product_measurements)'] || '';
      product.returnsInfo = row['Returns Info (product.metafields.custom.returns_info)'] || '';
      product.shippingInfo = row['Shipping Info (product.metafields.custom.shipping_info)'] || '';
      product.seoTitle = row['SEO Title'] || '';
      product.seoDescription = row['SEO Description'] || '';
      product.seoKeywords = row['SEO Keywords'] || '';
    }

    // Add variant
    const sku = row['Variant SKU'];
    const size = row['Option1 Value'];
    if (sku && size) {
      product.variants.push({
        sku,
        size: size.toUpperCase(),
        stock: parseInt(row['Variant Inventory Qty']) || 0,
        price: parseFloat(row['Variant Price']) || product.price,
      });
    }

    // Add image
    const imageUrl = row['Image Src'];
    if (imageUrl && !product.images.some((img) => img.url === imageUrl)) {
      product.images.push({
        url: imageUrl,
        position: parseInt(row['Image Position']) || 0,
        altText: row['Image Alt Text'] || '',
      });
    }
  }

  console.log(`Found ${productMap.size} products\n`);

  // Clean existing data (order matters for FK constraints)
  console.log('Cleaning existing data...');
  await prisma.productImage.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  console.log('  Done\n');

  // 1. Admin user
  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@earthrevibe.com' },
    update: {},
    create: {
      email: 'admin@earthrevibe.com',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      referralCode: 'ADMIN_REF',
    },
  });
  console.log('  admin@earthrevibe.com / Admin@123456\n');

  // 2. Categories
  console.log('Creating categories...');
  const categoryCache = new Map<string, string>();

  for (const product of productMap.values()) {
    const cat = getCategoryInfo(product.category);
    if (!categoryCache.has(cat.slug)) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: `${cat.name} collection by Earth Revibe`,
          isActive: true,
        },
      });
      categoryCache.set(cat.slug, created.id);
      console.log(`  ${cat.name}`);
    }
  }

  // 3. Products from CSV
  console.log('\nCreating products...');
  let count = 0;

  for (const data of productMap.values()) {
    const cat = getCategoryInfo(data.category);
    const categoryId = categoryCache.get(cat.slug)!;
    const description = stripHtml(data.bodyHtml) || `${data.title} by Earth Revibe`;
    const color = COLOR_MAP[data.handle] || { name: 'Natural', hex: '#D2B48C' };
    const isFeatured = (data.tags || '').toLowerCase().includes('stock');

    const product = await prisma.product.create({
      data: {
        name: data.title,
        slug: data.handle,
        description,
        shortDescription:
          description.length > 200 ? description.substring(0, 197) + '...' : description,
        price: data.price,
        material: data.material || undefined,
        careInstructions: data.careInstructions || undefined,
        washInstructions: data.washInstructions || undefined,
        composition: data.composition || undefined,
        fabricWeight: data.fabricWeight || undefined,
        fit: data.fit || undefined,
        origin: data.origin || undefined,
        printType: data.printType || undefined,
        measurements: data.measurements || undefined,
        returnsInfo: data.returnsInfo || undefined,
        shippingInfo: data.shippingInfo || undefined,
        seoTitle: data.seoTitle || undefined,
        seoDescription: data.seoDescription || undefined,
        seoKeywords: data.seoKeywords || undefined,
        status: 'ACTIVE',
        isFeatured,
        categoryId,
      },
    });

    // Create variants
    for (const v of data.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          size: v.size,
          color: color.name,
          colorHex: color.hex,
          stock: v.stock,
          isActive: true,
        },
      });
    }

    // Create images
    const sortedImages = data.images.sort((a, b) => a.position - b.position);
    for (let i = 0; i < sortedImages.length; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: sortedImages[i].url,
          publicId: `shopify-${data.handle}-${i + 1}`,
          altText: sortedImages[i].altText || data.title,
          sortOrder: i,
          isPrimary: i === 0,
        },
      });
    }

    count++;
    console.log(
      `  [${count}/${productMap.size}] ${data.title} (${data.variants.length} variants, ${sortedImages.length} images)`
    );
  }

  // 4. Store settings
  console.log('\nCreating store settings...');
  await prisma.storeSettings.upsert({
    where: { id: 'default-store-settings' },
    update: {},
    create: {
      id: 'default-store-settings',
      storeName: 'Earth Revibe',
      contactEmail: 'hello@earthrevibe.com',
      contactPhone: '+91-9876543210',
      socialInstagram: 'https://instagram.com/earthrevibe',
      freeShippingThreshold: 1499,
      gstRate: 18,
      returnWindowDays: 7,
    },
  });

  // 5. Shipping zones
  await prisma.shippingZone.deleteMany();
  await prisma.shippingZone.create({
    data: {
      name: 'Metro Cities',
      states: ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal'],
      rate: 0,
      minDays: 2,
      maxDays: 4,
      isActive: true,
    },
  });
  await prisma.shippingZone.create({
    data: { name: 'Rest of India', states: [], rate: 99, minDays: 4, maxDays: 7, isActive: true },
  });

  console.log('  Store settings & shipping zones created');

  console.log(`\n=== Seeded ${count} products successfully! ===`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
