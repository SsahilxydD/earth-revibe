"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema, type CreateCategoryInput } from "@earth-revibe/shared";
import { Button, Input, Textarea, Card, Badge, Modal } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema) as any,
  });

  const openCreate = () => {
    setEditingCategory(null);
    reset({ name: "", description: "", slug: "", sortOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || "",
      slug: category.slug,
      image: category.image || "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CreateCategoryInput) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync(data);
        toast.success("Category created");
      }
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success("Category deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Categories</h1>
          <p className="text-sm text-medium-gray mt-1">Organize your product catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Add Category
        </Button>
      </div>

      {/* Categories list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !categories?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No categories yet. Create your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray bg-off-white/50">
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Slug</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Order</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat: any) => (
                  <tr key={cat.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-charcoal">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-medium-gray line-clamp-1">{cat.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-dark-gray">{cat.slug}</td>
                    <td className="px-6 py-3 text-dark-gray">{cat.sortOrder}</td>
                    <td className="px-6 py-3">
                      <Badge variant={cat.isActive ? "success" : "default"}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} className="text-dark-gray" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 rounded-md hover:bg-error/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Tops & Basics"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Slug (auto-generated if empty)"
            placeholder="tops-and-basics"
            error={errors.slug?.message}
            {...register("slug")}
          />
          <Textarea
            label="Description"
            placeholder="Category description..."
            rows={3}
            error={errors.description?.message}
            {...register("description")}
          />
          <Input
            label="Image URL"
            placeholder="https://..."
            error={errors.image?.message}
            {...register("image")}
          />
          <Input
            label="Sort Order"
            type="number"
            error={errors.sortOrder?.message}
            {...register("sortOrder")}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-light-gray text-deep-earth focus:ring-deep-earth"
              {...register("isActive")}
            />
            <span className="text-sm text-charcoal">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingCategory ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
