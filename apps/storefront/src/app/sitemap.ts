import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.earthrevibe.com';

interface Product {
  slug: string;
  updatedAt?: string;
}

interface Collection {
  slug: string;
  updatedAt?: string;
}

interface BlogPost {
  slug: string;
  updatedAt?: string;
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';
    const baseUrl = apiBase.startsWith('http') ? apiBase : `https://${apiBase}`;

    const res = await fetch(`${baseUrl}/products?limit=1000`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const json = await res.json();
    return json.data?.products || json.data || [];
  } catch {
    return [];
  }
}

async function fetchCollections(): Promise<Collection[]> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';
    const baseUrl = apiBase.startsWith('http') ? apiBase : `https://${apiBase}`;

    const res = await fetch(`${baseUrl}/categories?limit=100`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const json = await res.json();
    return json.data?.collections || json.data || [];
  } catch {
    return [];
  }
}

async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'https://earth-revibeapi-production.up.railway.app/api/v1';
    const baseUrl = apiBase.startsWith('http') ? apiBase : `https://${apiBase}`;

    const res = await fetch(`${baseUrl}/blog/posts?limit=500`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const json = await res.json();
    return json.data?.posts || json.data || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, blogPosts] = await Promise.all([
    fetchProducts(),
    fetchCollections(),
    fetchBlogPosts(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/track-order`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/policies/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/policies/returns`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/policies/shipping`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/policies/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: `${SITE_URL}/categories/${collection.slug}`,
    lastModified: collection.updatedAt ? new Date(collection.updatedAt) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...collectionPages, ...blogPages];
}
