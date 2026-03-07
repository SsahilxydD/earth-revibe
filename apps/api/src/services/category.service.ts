import slugify from "slugify";
import { prisma } from "@earth-revibe/db";
import { ApiError } from "../utils/api-error";
import type { CreateCategoryInput, UpdateCategoryInput, ReorderCategoriesInput } from "@earth-revibe/shared";

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

export const categoryService = {
  async listCategories() {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      productCount: cat._count.products,
    }));
  },

  async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) throw ApiError.notFound("Category not found");

    return {
      ...category,
      productCount: category._count.products,
    };
  },

  async createCategory(data: CreateCategoryInput) {
    const slug = data.slug || generateSlug(data.name);

    // Check slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw ApiError.conflict("Category with this slug already exists");

    // Validate parentId if provided
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw ApiError.badRequest("Parent category not found");
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    return category;
  },

  async updateCategory(id: string, data: UpdateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Category not found");

    // Regenerate slug if name changes and no slug provided
    let slug = data.slug;
    if (data.name && data.name !== existing.name && !data.slug) {
      slug = generateSlug(data.name);
    }

    // Check slug uniqueness if slug is changing
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({ where: { slug } });
      if (slugExists) throw ApiError.conflict("Category with this slug already exists");
    }

    // Validate parentId if provided
    if (data.parentId) {
      if (data.parentId === id) throw ApiError.badRequest("Category cannot be its own parent");
      const parent = await prisma.category.findUnique({ where: { id: data.parentId } });
      if (!parent) throw ApiError.badRequest("Parent category not found");
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(slug !== undefined && { slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return category;
  },

  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
        children: true,
      },
    });

    if (!category) throw ApiError.notFound("Category not found");

    // Prevent deletion if category has products
    if (category._count.products > 0) {
      throw ApiError.badRequest("Cannot delete category with existing products. Reassign products first.");
    }

    // Reassign children to parent or root
    if (category.children.length > 0) {
      await prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: category.parentId },
      });
    }

    await prisma.category.delete({ where: { id } });
  },

  async reorderCategories(data: ReorderCategoriesInput) {
    const updates = data.categories.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await prisma.$transaction(updates);
  },
};
