'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  Upload,
  CheckSquare,
  FolderInput,
} from 'lucide-react';
import { Button, Badge, Card, Select, Modal } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import {
  useProducts,
  useDeleteProduct,
  useExportProductsCSV,
  useBulkUpdateProducts,
  useImportProductsCSV,
} from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const bulkStatusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'default',
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [newCategoryId, setNewCategoryId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useProducts({
    page,
    limit: 20,
    status: status || undefined,
    search: search || undefined,
  });
  const deleteProduct = useDeleteProduct();
  const exportCSV = useExportProductsCSV();
  const bulkUpdate = useBulkUpdateProducts();
  const importCSV = useImportProductsCSV();
  const { data: categoriesData } = useCategories();

  const products: any[] = data?.products || [];
  const allSelected = products.length > 0 && products.every((p: any) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p: any) => p.id)));
    }
  }, [allSelected, products]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name}"?`)) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Product archived');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive product');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV.mutateAsync();
      toast.success('CSV exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importCSV.mutateAsync(text);
      const info = result as any;
      const msg = `Import complete: ${info.created || 0} created, ${info.updated || 0} updated${info.errors ? `, ${info.errors} errors` : ''}`;
      if (info.errors > 0) {
        const details =
          info.errorDetails
            ?.slice(0, 5)
            .map((d: any) => `Row ${d.row}: ${d.message}`)
            .join('\n') || '';
        toast.error(`${msg}${details ? `\n${details}` : ''}`);
      } else {
        toast.success(msg);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to import CSV');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkPrice = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    try {
      await bulkUpdate.mutateAsync({
        productIds: Array.from(selectedIds),
        updates: { price },
      });
      toast.success(`Price updated for ${selectedIds.size} products`);
      setPriceModalOpen(false);
      setNewPrice('');
      clearSelection();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update prices');
    }
  };

  const handleBulkStatus = async () => {
    try {
      await bulkUpdate.mutateAsync({
        productIds: Array.from(selectedIds),
        updates: { status: newStatus },
      });
      toast.success(`Status updated for ${selectedIds.size} products`);
      setStatusModalOpen(false);
      clearSelection();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to archive ${count} product(s)?`)) return;
    try {
      await bulkUpdate.mutateAsync({
        productIds: Array.from(selectedIds),
        updates: { status: 'ARCHIVED' },
      });
      toast.success(`${count} product(s) archived`);
      clearSelection();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive products');
    }
  };

  const handleBulkCategory = async () => {
    if (!newCategoryId) {
      toast.error('Please select a category');
      return;
    }
    try {
      await bulkUpdate.mutateAsync({
        productIds: Array.from(selectedIds),
        updates: { categoryId: newCategoryId },
      });
      const catName =
        (categoriesData as any[])?.find((c: any) => c.id === newCategoryId)?.name || 'category';
      toast.success(`${selectedIds.size} product(s) moved to ${catName}`);
      setCategoryModalOpen(false);
      setNewCategoryId('');
      clearSelection();
    } catch (err: any) {
      toast.error(err.message || 'Failed to move products');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Products</h1>
          <p className="text-sm text-medium-gray mt-1">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleExportCSV} disabled={exportCSV.isPending}>
            <Download size={18} />
            {exportCSV.isPending ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={importCSV.isPending}
          >
            <Upload size={18} />
            {importCSV.isPending ? 'Importing...' : 'Import CSV'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <Link href="/products/new">
            <Button>
              <Plus size={18} />
              Add Product
            </Button>
          </Link>
        </div>
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
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load products</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !products.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-light-gray text-forest-green focus:ring-deep-earth/20 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Product</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Category</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Price</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: any) => (
                    <tr
                      key={product.id}
                      className={`border-b border-light-gray last:border-0 hover:bg-off-white/50 ${
                        selectedIds.has(product.id) ? 'bg-off-white/70' : ''
                      }`}
                    >
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 rounded border-light-gray text-forest-green focus:ring-deep-earth/20 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-charcoal">{product.name}</p>
                          <p className="text-xs text-medium-gray">{product.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-dark-gray">
                        {product.category?.name || '\u2014'}
                      </td>
                      <td className="px-6 py-3 text-charcoal">{formatPrice(product.price)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={statusVariant[product.status] || 'default'}>
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
                            onClick={() => handleDelete(product.id, product.name)}
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

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-charcoal text-white rounded-xl shadow-lg px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare size={16} />
            <span className="font-medium">{selectedIds.size} selected</span>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewPrice('');
              setPriceModalOpen(true);
            }}
            className="text-white hover:bg-white/10"
          >
            Update Price
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewStatus('ACTIVE');
              setStatusModalOpen(true);
            }}
            className="text-white hover:bg-white/10"
          >
            Change Status
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewCategoryId('');
              setCategoryModalOpen(true);
            }}
            className="text-white hover:bg-white/10"
          >
            <FolderInput size={14} />
            Move to Category
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            className="text-red-300 hover:bg-white/10"
          >
            <Trash2 size={14} />
            Archive Selected
          </Button>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={clearSelection}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Update Price Modal */}
      <Modal
        isOpen={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title="Update Price"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-medium-gray">
            Set a new price for {selectedIds.size} selected product(s).
          </p>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">New Price (INR)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPriceModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPrice} disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending ? 'Updating...' : 'Update Price'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-medium-gray">
            Set a new status for {selectedIds.size} selected product(s).
          </p>
          <Select
            label="New Status"
            options={bulkStatusOptions}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatus} disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending ? 'Updating...' : 'Change Status'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move to Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Move to Category"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-medium-gray">
            Move {selectedIds.size} selected product(s) to a new category.
          </p>
          <Select
            label="Category"
            options={[
              { value: '', label: 'Select a category' },
              ...((categoriesData as any[]) || []).map((c: any) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkCategory} disabled={bulkUpdate.isPending || !newCategoryId}>
              {bulkUpdate.isPending ? 'Moving...' : 'Move to Category'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
