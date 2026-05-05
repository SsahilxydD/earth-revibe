'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button, Card, Input, Select, Textarea, Spinner } from '@earth-revibe/ui';
import { useBlogPost, useUpdateBlogPost, useBlogCategories, useBlogTags } from '@/hooks/use-blog';

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useBlogPost(id);
  const updateMutation = useUpdateBlogPost();
  const { data: catData } = useBlogCategories();
  const { data: tagData } = useBlogTags();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '',
    status: 'DRAFT',
    metaTitle: '',
    metaDescription: '',
    categoryIds: [] as string[],
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (data?.post) {
      const p = data.post;
      setForm({
        title: p.title || '',
        slug: p.slug || '',
        excerpt: p.excerpt || '',
        content: p.content || '',
        featuredImage: p.featuredImage || '',
        status: p.status || 'DRAFT',
        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        categoryIds: p.categories?.map((c: any) => c.categoryId) || [],
        tagIds: p.tags?.map((t: any) => t.tagId) || [],
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!form.content.trim()) return;
    const payload = {
      ...form,
      excerpt: form.excerpt || undefined,
      featuredImage: form.featuredImage || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      categoryIds: form.categoryIds.length ? form.categoryIds : [],
      tagIds: form.tagIds.length ? form.tagIds : [],
    };
    try {
      await updateMutation.mutateAsync({ id, data: payload });
      router.push('/blog');
    } catch {
      // Error is handled by mutation onError callback
    }
  };

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/blog">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-charcoal">Edit Blog Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Excerpt</label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Content *</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={12}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Featured Image URL
              </label>
              <Input
                value={form.featuredImage}
                onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Publishing</h3>
          <Select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'SCHEDULED', label: 'Scheduled' },
            ]}
          />
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">Categories & Tags</h3>
          <div className="space-y-4">
            {catData?.categories?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {catData.categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, categoryIds: toggleArray(form.categoryIds, cat.id) })
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.categoryIds.includes(cat.id)
                          ? 'bg-deep-earth text-white border-deep-earth'
                          : 'bg-white text-charcoal border-light-gray hover:border-deep-earth'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tagData?.tags?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tagData.tags.map((tag: any) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setForm({ ...form, tagIds: toggleArray(form.tagIds, tag.id) })}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.tagIds.includes(tag.id)
                          ? 'bg-deep-earth text-white border-deep-earth'
                          : 'bg-white text-charcoal border-light-gray hover:border-deep-earth'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-charcoal mb-4">SEO</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Meta Title</label>
              <Input
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                maxLength={70}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Meta Description
              </label>
              <Textarea
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                rows={2}
                maxLength={160}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/blog">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
