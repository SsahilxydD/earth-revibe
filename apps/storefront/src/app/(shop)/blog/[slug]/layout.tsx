import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://earth-revibeapi-production.up.railway.app/api/v1";

async function getBlogPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || `Read ${post.title} on the Earth Revibe blog`;
  const image = post.featuredImage;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Earth Revibe Blog`,
      description,
      type: "article",
      ...(image && { images: [{ url: image }] }),
      ...(post.publishedAt && { publishedTime: post.publishedAt }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
