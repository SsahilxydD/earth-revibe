"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Badge, Spinner } from "@/components/ui";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => api.get(`/blog/${slug}`),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!post) return <p className="text-center py-20 text-medium-gray">Post not found.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-medium-gray hover:text-forest-green mb-6">
        <ArrowLeft size={16} /> Back to Blog
      </Link>

      {post.categories?.length > 0 && (
        <div className="flex gap-2 mb-3">
          {post.categories.map((pc: any) => (
            <Badge key={pc.category.id} variant="default">{pc.category.name}</Badge>
          ))}
        </div>
      )}

      <h1 className="text-3xl lg:text-4xl font-heading font-bold text-charcoal mb-4">{post.title}</h1>

      <div className="flex items-center gap-4 text-sm text-medium-gray mb-8">
        <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(post.publishedAt)}</span>
        <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime || 1} min read</span>
      </div>

      {post.featuredImage && (
        <div className="relative h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden mb-8">
          <Image src={post.featuredImage} alt={post.title} fill className="object-cover" />
        </div>
      )}

      <article className="prose prose-lg max-w-none text-charcoal prose-headings:text-charcoal prose-a:text-forest-green">
        {post.content.split("\n").map((para: string, i: number) => (
          para.trim() ? <p key={i}>{para}</p> : null
        ))}
      </article>

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-light-gray">
          {post.tags.map((pt: any) => (
            <span key={pt.tag.id} className="px-3 py-1 bg-off-white rounded-full text-xs text-medium-gray">
              #{pt.tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
