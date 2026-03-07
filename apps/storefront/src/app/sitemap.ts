const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://earthrevibe.com";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

export default async function sitemap() {
  const staticPages: SitemapEntry[] = [
    "", "/products", "/categories", "/about", "/contact", "/faq", "/size-guide",
    "/blog", "/policies/privacy", "/policies/returns", "/policies/shipping", "/policies/terms",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1.0 : 0.7,
  }));

  // Fetch dynamic pages
  let productPages: SitemapEntry[] = [];
  let categoryPages: SitemapEntry[] = [];
  let blogPages: SitemapEntry[] = [];

  try {
    const [productsRes, categoriesRes, blogRes] = await Promise.all([
      fetch(`${API_URL}/products?limit=1000`).then((r) => r.json()).catch(() => ({ data: { products: [] } })),
      fetch(`${API_URL}/categories`).then((r) => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/blog`).then((r) => r.json()).catch(() => ({ data: { posts: [] } })),
    ]);

    const products = productsRes?.data?.products || [];
    const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
    const posts = blogRes?.data?.posts || [];

    productPages = products.map((p: any) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    categoryPages = categories.map((c: any) => ({
      url: `${BASE_URL}/categories/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    blogPages = posts.map((b: any) => ({
      url: `${BASE_URL}/blog/${b.slug}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch {
    // Silently fail — static pages will still be in sitemap
  }

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
