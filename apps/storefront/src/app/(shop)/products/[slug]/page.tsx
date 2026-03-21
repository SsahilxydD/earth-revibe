import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SwipeableProductWrapper } from "@/components/product/swipeable-product-wrapper";
import type { Product } from "@/types";

/* ------------------------------------------------------------------ */
/*  Server-side data fetching                                          */
/* ------------------------------------------------------------------ */

function resolveApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://earth-revibeapi-production.up.railway.app/api/v1";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${resolveApiBase()}/products/${slug}`, {
      next: { revalidate: 60 },
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
    return { title: "Product Not Found | Earth Revibe" };
  }

  const title = product.seoTitle || `${product.name} | Earth Revibe`;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    `Shop ${product.name} at Earth Revibe. Indian streetwear.`;

  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];

  return {
    title,
    description,
    keywords: product.seoKeywords || undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: primaryImage
        ? [{ url: primaryImage.url, alt: primaryImage.altText || product.name }]
        : undefined,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return <SwipeableProductWrapper initialProduct={product} initialSlug={slug} />;
}
