import { Hero } from "@/components/home/hero";
import { CollectionBanner } from "@/components/home/collection-banner";
import { FeaturedProducts } from "@/components/home/featured-products";
import { NewArrivals } from "@/components/home/new-arrivals";
import { BrandStory } from "@/components/home/brand-story";
import { NewsletterSection } from "@/components/home/newsletter-section";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://earth-revibeapi-production.up.railway.app/api/v1";

function resolveApiUrl(base: string): string {
  if (base.startsWith("http://") || base.startsWith("https://")) return base;
  return `https://${base}`;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images?: { url: string; alt?: string }[];
  category?: { name: string } | null;
}

interface ProductsResponse {
  success: boolean;
  data?: {
    products: Product[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

async function fetchProducts(query: string): Promise<Product[]> {
  const url = `${resolveApiUrl(API_BASE)}/products?${query}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json: ProductsResponse = await res.json();
    return json.data?.products ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, newArrivals] = await Promise.all([
    fetchProducts("isFeatured=true&limit=8"),
    fetchProducts("limit=8&sortBy=createdAt&sortOrder=desc"),
  ]);

  return (
    <main>
      <Hero />
      <CollectionBanner />
      <FeaturedProducts products={featured} />
      <NewArrivals products={newArrivals} />
      <BrandStory />
      <NewsletterSection />
    </main>
  );
}
