"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { formatDate, getImageUrl, truncate } from "@/lib/utils";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  publishedAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  category?: string;
}

interface BlogResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const POSTS_PER_PAGE = 9;

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-[var(--button-radius)] border border-[var(--color-border)] transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-surface)]">
        <Image
          src={getImageUrl(post.featuredImage, 600)}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {post.category && (
          <span className="absolute left-3 top-3 rounded-[var(--badge-radius)] bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {post.category}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(post.publishedAt)}</span>
        </div>
        <h3 className="mt-2 text-sm font-bold uppercase tracking-wider transition-colors group-hover:text-[var(--color-muted)]">
          {post.title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          {truncate(post.excerpt, 120)}
        </p>
      </div>
    </Link>
  );
}

function BlogSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--button-radius)] border border-[var(--color-border)]"
        >
          <Skeleton className="aspect-[16/10] w-full" />
          <div className="p-4">
            <Skeleton width="40%" height={12} />
            <Skeleton className="mt-2" width="80%" height={16} />
            <Skeleton className="mt-2" width="100%" height={12} />
            <Skeleton className="mt-1" width="60%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BlogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<BlogResponse>({
    queryKey: ["blog-posts", page],
    queryFn: () =>
      api.get(`/blog/posts?page=${page}&limit=${POSTS_PER_PAGE}`),
  });

  return (
    <div className="px-4 py-8 md:px-8 lg:px-12 xl:px-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wider">
          The Journal
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Stories, style tips, and culture from the Earth Revibe universe.
        </p>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <BlogSkeleton />
        ) : data?.posts && data.posts.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.posts.map((post) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-[var(--color-muted)]">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page >= data.totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold">No posts yet</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Check back soon for new stories and updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
