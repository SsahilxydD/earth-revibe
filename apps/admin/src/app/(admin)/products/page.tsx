"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button, Badge, Card, Select } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

const statusVariant: Record<
  string,
  "success" | "warning" | "default" | "error"
> = {
  ACTIVE: "success",
  DRAFT: "warning",
  ARCHIVED: "default",
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProducts({
    page,
    limit: 20,
    status: status || undefined,
    search: search || undefined,
  });
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name}"?`)) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Product archived");
    } catch (err: any) {
      toast.error(err.message || "Failed to archive product");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Products</h1>
          <p className="text-sm text-medium-gray mt-1">
            Manage your product catalog
          </p>
        </div>
        <Link href="/products/new">
          <Button>
            <Plus size={18} />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
            />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Products table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.products?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Product
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Category
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Price
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product: any) => (
                    <tr
                      key={product.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-charcoal">
                            {product.name}
                          </p>
                          <p className="text-xs text-medium-gray">
                            {product.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">
                        {product.category?.name || "\u2014"}
                      </td>
                      <td className="px-6 py-3 text-charcoal">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={statusVariant[product.status] || "default"}
                        >
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${product.slug}/edit`}
                            className="p-1.5 rounded-md hover:bg-off-white transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} className="text-dark-gray" />
                          </Link>
                          <button
                            onClick={() =>
                              handleDelete(product.id, product.name)
                            }
                            className="p-1.5 rounded-md hover:bg-error/10 transition-colors"
                            title="Archive"
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

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} products)
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
          </>
        )}
      </Card>
    </div>
  );
}
