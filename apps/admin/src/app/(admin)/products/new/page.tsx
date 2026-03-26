'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductForm } from '@/components/products/product-form';
import { useCreateProduct } from '@/hooks/use-products';
import { toast } from '@/components/ui/toast';
import type { CreateProductInput } from '@earth-revibe/shared';

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const handleSubmit = async (data: CreateProductInput) => {
    try {
      const product = await createProduct.mutateAsync(data);
      toast.success('Product created. Add images and variants below.');
      // Redirect to edit page so user can immediately add images/variants
      router.push(`/products/${product.slug}/edit`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Add Product</h1>
          <p className="text-sm text-medium-gray mt-1">Create a new product listing</p>
        </div>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        isSubmitting={createProduct.isPending}
        submitLabel="Create Product"
      />
    </div>
  );
}
