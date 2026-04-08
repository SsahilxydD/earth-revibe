import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/product-detail';
import type { Product } from '@/types';

/* ------------------------------------------------------------------ */
/*  Server-side data fetching                                          */
/* ------------------------------------------------------------------ */

function resolveApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `https://${raw}`;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${resolveApiBase()}/products/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data as Product;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: 'Product Not Found | Earth Revibe' };
  }

  const title = product.seoTitle || `${product.name} | Earth Revibe`;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    `Shop ${product.name} at Earth Revibe. Vacation-ready minimal fashion.`;

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];

  return {
    title,
    description,
    keywords: product.seoKeywords || undefined,
    alternates: {
      canonical: `/products/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: primaryImage
        ? [
            {
              url: primaryImage.url,
              width: 1200,
              height: 630,
              alt: primaryImage.altText || product.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: primaryImage ? [primaryImage.url] : undefined,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function buildProductJsonLd(product: Product) {
  const inStock = product.variants.some((v) => v.stock > 0);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.seoDescription || product.name,
    image: product.images.map((img) => img.url),
    sku: product.variants[0]?.sku || product.id,
    brand: { '@type': 'Brand', name: 'Earth Revibe' },
    category: product.category?.name || 'Fashion',
    ...(product.material && { material: product.material }),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: Math.min(
        product.price,
        ...product.variants.filter((v) => v.price).map((v) => v.price!)
      ),
      highPrice: Math.max(
        product.price,
        ...product.variants.filter((v) => v.price).map((v) => v.price!)
      ),
      offerCount: product.variants.length || 1,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://earthrevibe.com/products/${product.slug}`,
    },
    ...(product.averageRating &&
      product.reviewCount > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.averageRating,
          reviewCount: product.reviewCount,
        },
      }),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const jsonLd = buildProductJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />
    </>
  );
}
