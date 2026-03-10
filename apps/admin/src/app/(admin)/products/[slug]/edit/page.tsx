"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProductForm } from "@/components/products/product-form";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { CreateProductInput } from "@earth-revibe/shared";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: product, isLoading, isError, error } = useProduct(slug);
  const updateProduct = useUpdateProduct();

  const handleSubmit = async (data: CreateProductInput) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, data });
      toast.success("Product updated successfully");
      router.push("/products");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" className="text-deep-earth" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-charcoal font-medium">Failed to load product</p>
        <p className="text-sm text-medium-gray">
          {(error as any)?.message || "Something went wrong. Check your connection and try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-deep-earth hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-medium-gray">Product not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="p-2 rounded-lg hover:bg-off-white transition-colors"
        >
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            Edit Product
          </h1>
          <p className="text-sm text-medium-gray mt-1">{product.name}</p>
        </div>
      </div>

      <ProductForm
        defaultValues={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription || undefined,
          price: product.price,
          compareAtPrice: product.compareAtPrice || undefined,
          material: product.material || undefined,
          careInstructions: product.careInstructions || undefined,
          productDetails: product.productDetails || undefined,
          composition: product.composition || undefined,
          fabricWeight: product.fabricWeight || undefined,
          fit: product.fit || undefined,
          measurements: product.measurements || undefined,
          printType: product.printType || undefined,
          washInstructions: product.washInstructions || undefined,
          origin: product.origin || undefined,
          returnsInfo: product.returnsInfo || undefined,
          shippingInfo: product.shippingInfo || undefined,
          seoTitle: product.seoTitle || undefined,
          seoDescription: product.seoDescription || undefined,
          status: product.status,
          isFeatured: product.isFeatured,
          categoryId: product.categoryId,
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateProduct.isPending}
        submitLabel="Update Product"
        productId={product.id}
        variants={product.variants || []}
        images={product.images || []}
      />
    </div>
  );
}
