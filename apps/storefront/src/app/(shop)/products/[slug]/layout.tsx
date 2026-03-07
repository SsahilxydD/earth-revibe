import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const title = product.name;
  const description = product.description?.slice(0, 160) || `Shop ${product.name} - sustainable clothing from Earth Revibe`;
  const image = product.images?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Earth Revibe`,
      description,
      ...(image && { images: [{ url: image }] }),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  const jsonLd = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.shortDescription,
    image: product.images?.[0]?.url,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
