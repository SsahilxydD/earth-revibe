"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProductSchema,
  type CreateProductInput,
  ProductStatus,
} from "@earth-revibe/shared";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Select, Textarea, Card } from "@/components/ui";
import { api } from "@/lib/api-client";
import { VariantEditor } from "./variant-editor";
import { ImageManager } from "./image-manager";

interface ProductFormProps {
  defaultValues?: Partial<CreateProductInput>;
  onSubmit: (data: CreateProductInput) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  /** When editing, pass the product id and related data */
  productId?: string;
  variants?: any[];
  images?: any[];
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  productId,
  variants,
  images,
}: ProductFormProps) {
  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories"),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema) as any,
    defaultValues: {
      status: ProductStatus.DRAFT,
      isFeatured: false,
      ...defaultValues,
    },
  });

  const currentPrice = watch("price");

  const statusOptions = [
    { value: ProductStatus.DRAFT, label: "Draft" },
    { value: ProductStatus.ACTIVE, label: "Active" },
    { value: ProductStatus.ARCHIVED, label: "Archived" },
  ];

  const categoryOptions = (categories || []).map((c: any) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Product Details
            </h3>
            <div className="space-y-4">
              <Input
                label="Product Name"
                placeholder="e.g. Organic Cotton T-Shirt"
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Slug (auto-generated if empty)"
                placeholder="organic-cotton-t-shirt"
                error={errors.slug?.message}
                {...register("slug")}
              />
              <Textarea
                label="Description"
                placeholder="Describe your product..."
                rows={5}
                error={errors.description?.message}
                {...register("description")}
              />
              <Input
                label="Short Description"
                placeholder="Brief product summary"
                error={errors.shortDescription?.message}
                {...register("shortDescription")}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Pricing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Price (INR)"
                type="number"
                step="0.01"
                placeholder="3999"
                error={errors.price?.message}
                {...register("price")}
              />
              <Input
                label="Compare At Price (INR)"
                type="number"
                step="0.01"
                placeholder="4999"
                helperText="Original price for showing discount"
                error={errors.compareAtPrice?.message}
                {...register("compareAtPrice")}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Details
            </h3>
            <div className="space-y-4">
              <Input
                label="Material"
                placeholder="100% Organic Cotton"
                error={errors.material?.message}
                {...register("material")}
              />
              <Textarea
                label="Care Instructions"
                placeholder="Machine wash cold..."
                rows={3}
                error={errors.careInstructions?.message}
                {...register("careInstructions")}
              />
            </div>
          </Card>

          {/* Image Management - only shown when editing (product has been saved) */}
          {productId && (
            <ImageManager
              productId={productId}
              images={images || []}
            />
          )}

          {/* Variant Management - only shown when editing */}
          {productId && (
            <VariantEditor
              productId={productId}
              variants={variants || []}
              basePrice={Number(currentPrice) || Number(defaultValues?.price) || 0}
            />
          )}
        </div>

        {/* Sidebar - right 1/3 */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Status
            </h3>
            <Select
              label="Product Status"
              options={statusOptions}
              error={errors.status?.message}
              {...register("status")}
            />
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">
              Organization
            </h3>
            <div className="space-y-4">
              <Select
                label="Category"
                options={categoryOptions}
                placeholder="Select category"
                error={errors.categoryId?.message}
                {...register("categoryId")}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-light-gray text-deep-earth focus:ring-deep-earth"
                  {...register("isFeatured")}
                />
                <span className="text-sm text-charcoal">Featured product</span>
              </label>
            </div>
          </Card>

          {/* Helpful hint for new products */}
          {!productId && (
            <Card>
              <div className="text-xs text-medium-gray">
                <p className="font-medium text-charcoal mb-1">Images & Variants</p>
                <p>
                  Save the product first, then you can add images and
                  variants from the edit page.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
