import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function getCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return { title: "Category Not Found" };
  }

  const title = `${category.name} - Sustainable Clothing`;
  const description = category.description || `Shop ${category.name} - eco-friendly, sustainable clothing from Earth Revibe`;
  const image = category.image;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Earth Revibe`,
      description,
      ...(image && { images: [{ url: image }] }),
    },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
