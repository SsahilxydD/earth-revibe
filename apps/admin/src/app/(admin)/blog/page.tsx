'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button, Badge, Card, Input, Select, Skeleton } from '@earth-revibe/ui';
import { useBlogPosts, useDeleteBlogPost } from '@/hooks/use-blog';

const statusVariant: Record<string, 'success' | 'warning' | 'default'> = {
  PUBLISHED: 'success',
  SCHEDULED: 'warning',
  DRAFT: 'default',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BlogListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError } = useBlogPosts(page, status || undefined, search || undefined);
  const deleteMutation = useDeleteBlogPost();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">Blog Posts</h1>
        <Link href="/blog/new">
          <Button>
            <Plus size={16} /> New Post
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              placeholder="Search posts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            placeholder="All Status"
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'SCHEDULED', label: 'Scheduled' },
            ]}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load blog posts</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !data?.posts?.length ? (
          <p className="text-medium-gray py-8 text-center">No blog posts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray text-left">
                  <th className="py-3 px-2 font-medium text-medium-gray">Title</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Status</th>
                  <th className="py-3 px-2 font-medium text-medium-gray">Date</th>
                  <th className="py-3 px-2 font-medium text-medium-gray w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.posts.map((post: any) => (
                  <tr key={post.id} className="border-b border-light-gray hover:bg-off-white/50">
                    <td className="py-3 px-2">
                      <p className="font-medium text-charcoal">{post.title}</p>
                      <p className="text-xs text-medium-gray">/{post.slug}</p>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={statusVariant[post.status] || 'default'}>{post.status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-medium-gray">
                      {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <Link href={`/blog/${post.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit2 size={14} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this post?')) deleteMutation.mutate(post.id);
                          }}
                        >
                          <Trash2 size={14} className="text-error" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-gray">
            <p className="text-xs text-medium-gray">
              Page {data.page} of {data.totalPages} ({data.total} posts)
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
