import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { CreateBlogPostInput, UpdateBlogPostInput, CreateBlogCategoryInput, CreateBlogTagInput } from "@earth-revibe/shared";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function calcReadTime(content: string): number {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

export const blogService = {
  async listPublished(page: number = 1, limit: number = 12, categorySlug?: string) {
    const where: any = { status: "PUBLISHED", publishedAt: { lte: new Date() } };
    if (categorySlug) {
      where.categories = { some: { category: { slug: categorySlug } } };
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          publishedAt: true,
          readTime: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getPublishedBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!post || post.status !== "PUBLISHED") {
      throw ApiError.notFound("Blog post not found");
    }

    return post;
  },

  async listAll(page: number = 1, limit: number = 20, status?: string, search?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!post) throw ApiError.notFound("Blog post not found");
    return post;
  },

  async create(authorId: string, data: CreateBlogPostInput) {
    const slug = data.slug || slugify(data.title);

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) throw ApiError.conflict("A post with this slug already exists");

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        authorId,
        status: data.status || "DRAFT",
        publishedAt: data.status === "PUBLISHED" ? new Date() : data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        readTime: calcReadTime(data.content),
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    return post;
  },

  async update(id: string, data: UpdateBlogPostInput) {
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Blog post not found");

    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
      if (slugTaken) throw ApiError.conflict("A post with this slug already exists");
    }

    if (data.categoryIds !== undefined) {
      await prisma.blogPostCategory.deleteMany({ where: { postId: id } });
    }
    if (data.tagIds !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { postId: id } });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" && !existing.publishedAt ? new Date() : data.publishedAt ? new Date(data.publishedAt) : undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        readTime: data.content ? calcReadTime(data.content) : undefined,
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    return post;
  },

  async delete(id: string) {
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw ApiError.notFound("Blog post not found");
    await prisma.blogPost.delete({ where: { id } });
  },

  async listCategories() {
    return prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
  },

  async createCategory(data: CreateBlogCategoryInput) {
    const slug = data.slug || slugify(data.name);
    return prisma.blogCategory.create({ data: { name: data.name, slug } });
  },

  async deleteCategory(id: string) {
    await prisma.blogCategory.delete({ where: { id } });
  },

  async listTags() {
    return prisma.blogTag.findMany({ orderBy: { name: "asc" } });
  },

  async createTag(data: CreateBlogTagInput) {
    const slug = data.slug || slugify(data.name);
    return prisma.blogTag.create({ data: { name: data.name, slug } });
  },

  async deleteTag(id: string) {
    await prisma.blogTag.delete({ where: { id } });
  },
};
