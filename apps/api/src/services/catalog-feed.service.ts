import { prisma } from '@earth-revibe/db';
import { env } from '../config/env';

const BRAND = 'Earth Revibe';
const CURRENCY = 'INR';
const GOOGLE_PRODUCT_CATEGORY = 'Apparel & Accessories > Clothing';

function storefrontBase(): string {
  const raw = env.FRONTEND_URL || 'https://www.earthrevibe.com';
  return raw.replace(/\/$/, '');
}

function csvEscape(value: string | null | undefined): string {
  if (value == null) return '';
  const s = String(value)
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} ${CURRENCY}`;
}

const HEADER = [
  'id',
  'item_group_id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'color',
  'size',
  'google_product_category',
  'product_type',
];

export async function generateMetaCatalogFeed(): Promise<string> {
  const base = storefrontBase();

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      price: true,
      compareAtPrice: true,
      category: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        select: { url: true },
      },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          price: true,
          stock: true,
        },
      },
    },
  });

  const rows: string[] = [HEADER.join(',')];

  for (const p of products) {
    if (p.variants.length === 0) continue;

    const productPrice = Number(p.price);
    const compareAt = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;

    const desc = truncate(stripHtml(p.description) || p.shortDescription || p.name, 5000);
    const link = `${base}/products/${p.slug}`;
    const primaryImage = p.images[0]?.url ?? '';
    const additionalImages = p.images
      .slice(1, 11)
      .map((i) => i.url)
      .join(',');
    const productType = p.category?.name ?? '';

    for (const v of p.variants) {
      const variantPrice = v.price != null ? Number(v.price) : productPrice;
      const onSale = compareAt != null && compareAt > variantPrice;
      const listPrice = onSale ? compareAt! : variantPrice;
      const salePrice = onSale ? variantPrice : null;

      const availability = v.stock > 0 ? 'in stock' : 'out of stock';

      const titleParts = [p.name, v.color, v.size].filter(Boolean).join(' - ');

      const row = [
        csvEscape(v.sku || v.id),
        csvEscape(p.id),
        csvEscape(truncate(titleParts, 150)),
        csvEscape(desc),
        csvEscape(availability),
        csvEscape('new'),
        csvEscape(formatPrice(listPrice)),
        csvEscape(salePrice != null ? formatPrice(salePrice) : ''),
        csvEscape(link),
        csvEscape(primaryImage),
        csvEscape(additionalImages),
        csvEscape(BRAND),
        csvEscape(v.color || ''),
        csvEscape(v.size || ''),
        csvEscape(GOOGLE_PRODUCT_CATEGORY),
        csvEscape(productType),
      ].join(',');

      rows.push(row);
    }
  }

  return rows.join('\n') + '\n';
}
