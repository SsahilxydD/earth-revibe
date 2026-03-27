'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCategorySchema, type CreateCategoryInput } from '@earth-revibe/shared';
import { Button, Input, Textarea, Card, Badge, Modal } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useAddProductsToCategory,
  useCategoryProductIds,
} from '@/hooks/use-categories';
import { useProducts } from '@/hooks/use-products';

/* ------------------------------------------------------------------ */
/*  Product picker modal for a category                                */
/* ------------------------------------------------------------------ */
function CategoryProductPicker({
  category,
  onClose,
}: {
  category: { id: string; name: string };
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const { data, isLoading, isError } = useProducts({ page: 1, limit: 100 });
  const addProducts = useAddProductsToCategory();

  // Fetch product IDs already in this category via join table
  const { data: categoryProductData } = useCategoryProductIds(category.id);
  const assignedIds = useMemo(() => {
    const ids = (categoryProductData as any)?.data || categoryProductData || [];
    return new Set<string>(Array.isArray(ids) ? ids : []);
  }, [categoryProductData]);

  const allProducts: any[] = (data as any)?.products || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allProducts;
    const q = search.toLowerCase();
    return allProducts.filter(
      (p: any) => p.name.toLowerCase().includes(q) || p.category?.name?.toLowerCase().includes(q)
    );
  }, [allProducts, search]);

  const isInCategory = (p: any) =>
    p.categoryId === category.id || p.category?.id === category.id || assignedIds.has(p.id);

  const isChecked = (p: any) => isInCategory(p) || pendingAdds.has(p.id);

  const toggleProduct = (productId: string, alreadyInCategory: boolean) => {
    if (alreadyInCategory) return;
    setPendingAdds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (pendingAdds.size === 0) {
      onClose();
      return;
    }
    try {
      await addProducts.mutateAsync({
        categoryId: category.id,
        productIds: Array.from(pendingAdds),
      });
      toast.success(`${pendingAdds.size} product(s) added to ${category.name}`);
      setPendingAdds(new Set());
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update products');
    }
  };

  // Sort: checked first, then unchecked
  const sorted = useMemo(() => {
    const inCat = filtered.filter((p: any) => isChecked(p));
    const notInCat = filtered.filter((p: any) => !isChecked(p));
    return [...inCat, ...notInCat];
  }, [filtered, pendingAdds]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-medium-gray">
        Tick products to add them to <strong>{category.name}</strong>.
        {pendingAdds.size > 0 && (
          <span className="ml-1 font-medium text-deep-earth">
            {pendingAdds.size} change(s) pending
          </span>
        )}
      </p>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
        />
      </div>

      {/* Product list */}
      <div className="max-h-[400px] overflow-y-auto border border-light-gray rounded-lg divide-y divide-light-gray">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-6 text-center text-sm text-red-500">
            Failed to load products. Check your session.
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-medium-gray">
            {allProducts.length === 0
              ? 'No products in the catalog yet.'
              : 'No products match your search.'}
          </p>
        ) : (
          sorted.map((product: any) => {
            const alreadyIn = isInCategory(product);
            const isPending = pendingAdds.has(product.id);
            return (
              <label
                key={product.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isPending ? 'bg-deep-earth/5' : 'hover:bg-off-white/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked(product)}
                  onChange={() => toggleProduct(product.id, alreadyIn)}
                  disabled={alreadyIn}
                  className="w-4 h-4 rounded border-light-gray text-deep-earth focus:ring-deep-earth disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{product.name}</p>
                  <p className="text-xs text-medium-gray">
                    {alreadyIn ? category.name : product.category?.name || 'No category'} &middot;{' '}
                    {product.status}
                    {isPending && (
                      <span className="ml-1 text-deep-earth font-medium">• will be added</span>
                    )}
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={pendingAdds.size === 0 || addProducts.isPending}>
          {addProducts.isPending
            ? 'Saving...'
            : pendingAdds.size > 0
              ? `Save (${pendingAdds.size} change${pendingAdds.size > 1 ? 's' : ''})`
              : 'Done'}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main categories page                                               */
/* ------------------------------------------------------------------ */
export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [pickerCategory, setPickerCategory] = useState<any>(null);

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
    reset({ name: '', description: '', slug: '', sortOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      slug: category.slug,
      image: category.image || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CreateCategoryInput) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data });
        toast.success('Category updated');
      } else {
        await createCategory.mutateAsync(data);
        toast.success('Category created');
      }
      setIsModalOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCategory.mutateAsync(id);
      toast.success('Category deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
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
                  <tr
                    key={cat.id}
                    className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                  >
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
                      <Badge variant={cat.isActive ? 'success' : 'default'}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPickerCategory(cat)}
                          className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                          title="Manage Products"
                        >
                          <Package size={16} className="text-dark-gray" />
                        </button>
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
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g. Tops & Basics"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Slug (auto-generated if empty)"
            placeholder="tops-and-basics"
            error={errors.slug?.message}
            {...register('slug')}
          />
          <Textarea
            label="Description"
            placeholder="Category description..."
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
          <Input
            label="Image URL"
            placeholder="https://..."
            error={errors.image?.message}
            {...register('image')}
          />
          <Input
            label="Sort Order"
            type="number"
            error={errors.sortOrder?.message}
            {...register('sortOrder', { valueAsNumber: true })}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-light-gray text-deep-earth focus:ring-deep-earth"
              {...register('isActive')}
            />
            <span className="text-sm text-charcoal">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product Picker Modal */}
      <Modal
        isOpen={!!pickerCategory}
        onClose={() => setPickerCategory(null)}
        title={`Products in ${pickerCategory?.name || ''}`}
        size="lg"
      >
        {pickerCategory && (
          <CategoryProductPicker
            category={pickerCategory}
            onClose={() => setPickerCategory(null)}
          />
        )}
      </Modal>
    </div>
  );
}
