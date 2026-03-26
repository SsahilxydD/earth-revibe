import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blogService } from '../blog.service';
import { ApiError } from '../../utils/api-error';

vi.mock('@earth-revibe/db', () => ({
  prisma: {
    blogPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    blogPostCategory: {
      deleteMany: vi.fn(),
    },
    blogPostTag: {
      deleteMany: vi.fn(),
    },
    blogCategory: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    blogTag: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
  Prisma: {},
}));

import { prisma } from '@earth-revibe/db';

const mockPost = {
  id: 'post-1',
  title: 'Hello World',
  slug: 'hello-world',
  excerpt: 'A short intro',
  content: 'This is the content of the post with some words.',
  featuredImage: null,
  authorId: 'author-1',
  status: 'DRAFT',
  publishedAt: null,
  scheduledAt: null,
  metaTitle: null,
  metaDescription: null,
  readTime: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  categories: [],
  tags: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('blogService.listAll', () => {
  it('returns paginated posts with defaults', async () => {
    vi.mocked(prisma.blogPost.findMany).mockResolvedValue([mockPost] as any);
    vi.mocked(prisma.blogPost.count).mockResolvedValue(1);

    const result = await blogService.listAll();

    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
    expect(result.posts).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('filters by status when provided', async () => {
    vi.mocked(prisma.blogPost.findMany).mockResolvedValue([]);
    vi.mocked(prisma.blogPost.count).mockResolvedValue(0);

    await blogService.listAll(1, 20, 'PUBLISHED');

    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) })
    );
  });

  it('applies OR search across title and excerpt', async () => {
    vi.mocked(prisma.blogPost.findMany).mockResolvedValue([]);
    vi.mocked(prisma.blogPost.count).mockResolvedValue(0);

    await blogService.listAll(1, 20, undefined, 'green');

    const call = vi.mocked(prisma.blogPost.findMany).mock.calls[0][0] as any;
    expect(call.where.OR).toEqual([
      { title: { contains: 'green', mode: 'insensitive' } },
      { excerpt: { contains: 'green', mode: 'insensitive' } },
    ]);
  });

  it('calculates totalPages correctly for multi-page results', async () => {
    vi.mocked(prisma.blogPost.findMany).mockResolvedValue([]);
    vi.mocked(prisma.blogPost.count).mockResolvedValue(45);

    const result = await blogService.listAll(1, 20);

    expect(result.totalPages).toBe(3);
  });
});

describe('blogService.getById', () => {
  it('returns post when found', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);

    const result = await blogService.getById('post-1');

    expect(result).toEqual(mockPost);
    expect(prisma.blogPost.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'post-1' } })
    );
  });

  it('throws ApiError.notFound when post does not exist', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);

    await expect(blogService.getById('missing-id')).rejects.toThrow(ApiError);
    await expect(blogService.getById('missing-id')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('blogService.create', () => {
  it('generates slug from title when slug is not provided', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({
      ...mockPost,
      slug: 'hello-world',
    } as any);

    await blogService.create('author-1', {
      title: 'Hello World',
      content: 'Some content here',
      excerpt: 'Short',
      status: 'DRAFT' as any,
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.slug).toBe('hello-world');
  });

  it('slugifies title: lowercases and replaces non-alphanumeric with hyphens', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({ ...mockPost } as any);

    await blogService.create('author-1', {
      title: 'Top 10 Tips & Tricks!',
      content: 'Content here',
      excerpt: 'Short',
      status: 'DRAFT' as any,
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.slug).toBe('top-10-tips-tricks');
  });

  it('uses provided slug when supplied', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({
      ...mockPost,
      slug: 'custom-slug',
    } as any);

    await blogService.create('author-1', {
      title: 'Hello World',
      slug: 'custom-slug',
      content: 'Content',
      excerpt: 'Short',
      status: 'DRAFT' as any,
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.slug).toBe('custom-slug');
    // findUnique is called with the provided slug for uniqueness check
    expect(prisma.blogPost.findUnique).toHaveBeenCalledWith({ where: { slug: 'custom-slug' } });
  });

  it('throws ApiError.conflict when slug already exists', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);

    await expect(
      blogService.create('author-1', {
        title: 'Hello World',
        content: 'Content',
        excerpt: 'Short',
        status: 'DRAFT' as any,
      })
    ).rejects.toThrow(ApiError);

    await expect(
      blogService.create('author-1', {
        title: 'Hello World',
        content: 'Content',
        excerpt: 'Short',
        status: 'DRAFT' as any,
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('calculates readTime based on word count (200 wpm, minimum 1)', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({ ...mockPost } as any);

    // 400 words = 2 minutes
    const fourHundredWords = Array(400).fill('word').join(' ');
    await blogService.create('author-1', {
      title: 'Test',
      content: fourHundredWords,
      excerpt: 'Short',
      status: 'DRAFT' as any,
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.readTime).toBe(2);
  });

  it('enforces minimum readTime of 1 for very short content', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({ ...mockPost } as any);

    await blogService.create('author-1', {
      title: 'Test',
      content: 'Short.',
      excerpt: 'Short',
      status: 'DRAFT' as any,
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.readTime).toBe(1);
  });

  it('sets publishedAt to now when status is PUBLISHED', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({ ...mockPost } as any);

    const before = new Date();
    await blogService.create('author-1', {
      title: 'Test Post',
      content: 'Some content',
      excerpt: 'Short',
      status: 'PUBLISHED' as any,
    });
    const after = new Date();

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    const publishedAt: Date = createCall.data.publishedAt;
    expect(publishedAt).toBeInstanceOf(Date);
    expect(publishedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(publishedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('does not set publishedAt for DRAFT status', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({ ...mockPost } as any);

    await blogService.create('author-1', {
      title: 'Draft Post',
      content: 'Some content',
      excerpt: 'Short',
      status: 'DRAFT' as any,
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.publishedAt).toBeUndefined();
  });

  it('creates categories and tags relations when ids are provided', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.blogPost.create).mockResolvedValue({ ...mockPost } as any);

    await blogService.create('author-1', {
      title: 'Test',
      content: 'Content',
      excerpt: 'Short',
      status: 'DRAFT' as any,
      categoryIds: ['cat-1', 'cat-2'],
      tagIds: ['tag-1'],
    });

    const createCall = vi.mocked(prisma.blogPost.create).mock.calls[0][0] as any;
    expect(createCall.data.categories.create).toEqual([
      { categoryId: 'cat-1' },
      { categoryId: 'cat-2' },
    ]);
    expect(createCall.data.tags.create).toEqual([{ tagId: 'tag-1' }]);
  });
});

describe('blogService.update', () => {
  it('throws ApiError.notFound when post does not exist', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);

    await expect(blogService.update('missing-id', { title: 'New Title' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws ApiError.conflict when new slug is already taken by a different post', async () => {
    // First call: finds the post to update
    // Second call: finds a collision on the new slug
    vi.mocked(prisma.blogPost.findUnique)
      .mockResolvedValueOnce({ ...mockPost, id: 'post-1', slug: 'old-slug' } as any)
      .mockResolvedValueOnce({ ...mockPost, id: 'post-99', slug: 'taken-slug' } as any);

    await expect(blogService.update('post-1', { slug: 'taken-slug' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('does not check slug uniqueness when slug is unchanged', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    await blogService.update('post-1', { slug: mockPost.slug });

    // findUnique should only be called once (the initial existence check)
    expect(prisma.blogPost.findUnique).toHaveBeenCalledTimes(1);
  });

  it('deletes and recreates categories when categoryIds is provided', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPostCategory.deleteMany).mockResolvedValue({ count: 2 } as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    await blogService.update('post-1', { categoryIds: ['cat-new'] });

    expect(prisma.blogPostCategory.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-1' },
    });
  });

  it('deletes and recreates tags when tagIds is provided', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPostTag.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    await blogService.update('post-1', { tagIds: ['tag-new'] });

    expect(prisma.blogPostTag.deleteMany).toHaveBeenCalledWith({ where: { postId: 'post-1' } });
  });

  it('does not delete categories when categoryIds is undefined', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    await blogService.update('post-1', { title: 'Updated Title' });

    expect(prisma.blogPostCategory.deleteMany).not.toHaveBeenCalled();
  });

  it('recalculates readTime when content is provided in update', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    const sixHundredWords = Array(600).fill('word').join(' ');
    await blogService.update('post-1', { content: sixHundredWords });

    const updateCall = vi.mocked(prisma.blogPost.update).mock.calls[0][0] as any;
    expect(updateCall.data.readTime).toBe(3);
  });

  it('does not set readTime when content is not provided in update', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    await blogService.update('post-1', { title: 'New Title Only' });

    const updateCall = vi.mocked(prisma.blogPost.update).mock.calls[0][0] as any;
    expect(updateCall.data.readTime).toBeUndefined();
  });

  it('sets publishedAt when transitioning to PUBLISHED and no publishedAt exists', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue({
      ...mockPost,
      publishedAt: null,
    } as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    const before = new Date();
    await blogService.update('post-1', { status: 'PUBLISHED' as any });

    const updateCall = vi.mocked(prisma.blogPost.update).mock.calls[0][0] as any;
    expect(updateCall.data.publishedAt).toBeInstanceOf(Date);
    expect(updateCall.data.publishedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('does not overwrite publishedAt when post was already published', async () => {
    const alreadyPublished = new Date('2024-01-01');
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue({
      ...mockPost,
      publishedAt: alreadyPublished,
    } as any);
    vi.mocked(prisma.blogPost.update).mockResolvedValue({ ...mockPost } as any);

    await blogService.update('post-1', { status: 'PUBLISHED' as any });

    const updateCall = vi.mocked(prisma.blogPost.update).mock.calls[0][0] as any;
    // The expression: status===PUBLISHED && !existing.publishedAt => false, so publishedAt update
    // falls through to the data.publishedAt branch which is undefined => undefined
    expect(updateCall.data.publishedAt).toBeUndefined();
  });
});

describe('blogService.delete', () => {
  it('deletes the post when it exists', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(mockPost as any);
    vi.mocked(prisma.blogPost.delete).mockResolvedValue(mockPost as any);

    await blogService.delete('post-1');

    expect(prisma.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
  });

  it('throws ApiError.notFound when post does not exist', async () => {
    vi.mocked(prisma.blogPost.findUnique).mockResolvedValue(null);

    await expect(blogService.delete('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    expect(prisma.blogPost.delete).not.toHaveBeenCalled();
  });
});

describe('blogService — categories', () => {
  it('listCategories returns sorted categories', async () => {
    const cats = [{ id: 'c1', name: 'Eco', slug: 'eco' }];
    vi.mocked(prisma.blogCategory.findMany).mockResolvedValue(cats as any);

    const result = await blogService.listCategories();

    expect(result).toEqual(cats);
    expect(prisma.blogCategory.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('createCategory generates slug from name when not provided', async () => {
    vi.mocked(prisma.blogCategory.create).mockResolvedValue({
      id: 'c1',
      name: 'Eco Living',
      slug: 'eco-living',
    } as any);

    await blogService.createCategory({ name: 'Eco Living' });

    expect(prisma.blogCategory.create).toHaveBeenCalledWith({
      data: { name: 'Eco Living', slug: 'eco-living' },
    });
  });

  it('createCategory uses provided slug', async () => {
    vi.mocked(prisma.blogCategory.create).mockResolvedValue({
      id: 'c1',
      name: 'Eco',
      slug: 'custom-eco',
    } as any);

    await blogService.createCategory({ name: 'Eco', slug: 'custom-eco' });

    expect(prisma.blogCategory.create).toHaveBeenCalledWith({
      data: { name: 'Eco', slug: 'custom-eco' },
    });
  });

  it('deleteCategory calls prisma with correct id', async () => {
    vi.mocked(prisma.blogCategory.delete).mockResolvedValue({} as any);

    await blogService.deleteCategory('cat-1');

    expect(prisma.blogCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
  });
});

describe('blogService — tags', () => {
  it('listTags returns sorted tags', async () => {
    const tags = [{ id: 't1', name: 'Organic', slug: 'organic' }];
    vi.mocked(prisma.blogTag.findMany).mockResolvedValue(tags as any);

    const result = await blogService.listTags();

    expect(result).toEqual(tags);
    expect(prisma.blogTag.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('createTag generates slug from name when not provided', async () => {
    vi.mocked(prisma.blogTag.create).mockResolvedValue({
      id: 't1',
      name: 'Zero Waste',
      slug: 'zero-waste',
    } as any);

    await blogService.createTag({ name: 'Zero Waste' });

    expect(prisma.blogTag.create).toHaveBeenCalledWith({
      data: { name: 'Zero Waste', slug: 'zero-waste' },
    });
  });

  it('deleteTag calls prisma with correct id', async () => {
    vi.mocked(prisma.blogTag.delete).mockResolvedValue({} as any);

    await blogService.deleteTag('tag-1');

    expect(prisma.blogTag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
  });
});
