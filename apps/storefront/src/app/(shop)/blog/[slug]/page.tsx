'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, ChevronLeft, Facebook, Twitter, Link2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { formatDate, getImageUrl, truncate } from '@/lib/utils';
import { useToast } from '@/providers';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  publishedAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  category?: string;
}

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  featuredImage: string;
  publishedAt: string;
}

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const { addToast } = useToast();

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/blog/${slug}` : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      addToast('Link copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy link', 'error');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Share
      </span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface)]"
        aria-label="Share on Facebook"
      >
        <Facebook className="h-4 w-4" />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface)]"
        aria-label="Share on Twitter"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <button
        onClick={handleCopyLink}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface)]"
        aria-label="Copy link"
      >
        <Link2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function RelatedPostCard({ post }: { post: RelatedPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-[var(--button-radius)] border border-[var(--color-border)] transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-surface)]">
        <Image
          src={getImageUrl(post.featuredImage, 400)}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-3">
        <p className="text-xs text-[var(--color-muted)]">{formatDate(post.publishedAt)}</p>
        <h3 className="mt-1 text-sm font-bold uppercase tracking-wider transition-colors group-hover:text-[var(--color-muted)]">
          {truncate(post.title, 60)}
        </h3>
      </div>
    </Link>
  );
}

function BlogDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <Skeleton width={100} height={14} />
      <Skeleton className="mt-4" width="90%" height={32} />
      <Skeleton className="mt-2" width="60%" height={32} />
      <div className="mt-4 flex gap-4">
        <Skeleton width={100} height={14} />
        <Skeleton width={100} height={14} />
      </div>
      <Skeleton className="mt-6 aspect-[16/9] w-full" />
      <div className="mt-8 space-y-3">
        <Skeleton width="100%" height={14} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} />
      </div>
    </div>
  );
}

export default function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ['blog-post', slug],
    queryFn: () => api.get(`/blog/posts/${slug}`),
  });

  const { data: relatedPosts } = useQuery<RelatedPost[]>({
    queryKey: ['blog-related', slug],
    queryFn: () => api.get(`/blog/posts/${slug}/related`),
    enabled: !!post,
  });

  if (isLoading) {
    return <BlogDetailSkeleton />;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center lg:px-8">
        <h2 className="text-xl font-bold uppercase tracking-wider">Post not found</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          The blog post you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/blog"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      {post.category && (
        <span className="mt-4 inline-block rounded-[var(--badge-radius)] bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {post.category}
        </span>
      )}

      <h1 className="mt-3 text-2xl font-bold uppercase tracking-wider sm:text-3xl">{post.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          <span>{post.author.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(post.publishedAt)}</span>
        </div>
      </div>

      {post.featuredImage && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[var(--button-radius)] bg-[var(--color-surface)]">
          <Image
            src={getImageUrl(post.featuredImage, 1200)}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}

      <div
        className="prose mt-8 max-w-none text-sm leading-relaxed text-[var(--color-text)] [&_a]:text-[var(--color-primary)] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-muted)] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wider [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wider [&_img]:rounded-[var(--button-radius)] [&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-4 [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className="mt-8 border-t border-[var(--color-border)] pt-6">
        <ShareButtons title={post.title} slug={post.slug} />
      </div>

      {relatedPosts && relatedPosts.length > 0 && (
        <div className="mt-12 border-t border-[var(--color-border)] pt-8">
          <h2 className="text-lg font-bold uppercase tracking-wider">Related Posts</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {relatedPosts.slice(0, 3).map((rp) => (
              <RelatedPostCard key={rp.id} post={rp} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
