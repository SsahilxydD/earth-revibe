"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Badge, Skeleton } from "@/components/ui";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("");

  const { data: categoriesData } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: () => api.get("/blog/categories"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts", page, activeCategory],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (activeCategory) params.set("category", activeCategory);
      return api.get(`/blog?${params}`);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl lg:text-4xl font-heading font-bold text-charcoal">Our Blog</h1>
        <p className="text-medium-gray mt-2 max-w-xl mx-auto">
          Stories about sustainable fashion, eco-friendly living, and the journey behind Earth Revibe.
        </p>
      </div>

      {/* Categories */}
      {categoriesData?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => { setActiveCategory(""); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory ? "bg-forest-green text-white" : "bg-off-white text-charcoal hover:bg-cream"
            }`}
          >
            All
          </button>
          {categoriesData.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.slug); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.slug ? "bg-forest-green text-white" : "bg-off-white text-charcoal hover:bg-cream"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
        </div>
      ) : !data?.posts?.length ? (
        <p className="text-center text-medium-gray py-16">No blog posts yet. Check back soon!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.posts.map((post: any) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <div className="bg-white rounded-xl border border-light-gray overflow-hidden hover:shadow-md transition-shadow">
                {post.featuredImage ? (
                  <div className="relative h-48 bg-off-white">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-forest-green/10 to-sage/20 flex items-center justify-center">
                    <span className="text-4xl">🌿</span>
                  </div>
                )}
                <div className="p-5">
                  {post.categories?.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {post.categories.slice(0, 2).map((pc: any) => (
                        <Badge key={pc.category.id} variant="default">{pc.category.name}</Badge>
                      ))}
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-charcoal group-hover:text-forest-green transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-medium-gray mt-2 line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 text-xs text-medium-gray">
                      <Clock size={12} />
                      <span>{post.readTime || 1} min read</span>
                    </div>
                    <span className="text-xs text-medium-gray">{formatDate(post.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-medium-gray">Page {data.page} of {data.totalPages}</span>
          <Button variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
