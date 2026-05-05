'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  Pencil,
  Check,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { Button, Badge, Card, Select, Modal } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { toast } from '@earth-revibe/ui/toast';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  useInventory,
  useInventorySummary,
  useUpdateStock,
  useAdjustStock,
  useBulkUpdateStock,
} from '@/hooks/use-inventory';

const filterOptions = [
  { value: '', label: 'All Stock Levels' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
];

const sortOptions = [
  { value: 'stock_asc', label: 'Stock: Low to High' },
  { value: 'stock_desc', label: 'Stock: High to Low' },
  { value: 'product_name', label: 'Product Name' },
  { value: 'updated_at', label: 'Recently Updated' },
];

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <Badge variant="error">Out of Stock</Badge>;
  }
  if (stock <= 10) {
    return <Badge variant="warning">{stock} left</Badge>;
  }
  return <Badge variant="success">In Stock ({stock})</Badge>;
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState('');
  const [sortBy, setSortBy] = useState('stock_asc');
  const [page, setPage] = useState(1);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Adjust modal state
  const [adjustModal, setAdjustModal] = useState<{
    variantId: string;
    productName: string;
    variant: string;
    currentStock: number;
  } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState('');

  const { data, isLoading, isError } = useInventory({
    page,
    limit: 20,
    search: search || undefined,
    lowStock: lowStock || undefined,
    sortBy,
  });

  const { data: summary, isLoading: summaryLoading } = useInventorySummary();
  const updateStock = useUpdateStock();
  const adjustStock = useAdjustStock();
  const bulkUpdateStock = useBulkUpdateStock();

  const variants = data?.variants || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  // Inline edit handlers
  const startEdit = useCallback((variantId: string, currentStock: number) => {
    setEditingId(variantId);
    setEditValue(String(currentStock));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback(
    (variantId: string) => {
      const stock = parseInt(editValue, 10);
      if (isNaN(stock) || stock < 0) {
        toast.error('Stock must be a non-negative number');
        return;
      }
      updateStock.mutate(
        { variantId, stock },
        {
          onSuccess: () => {
            toast.success('Stock updated successfully');
            cancelEdit();
          },
          onError: (err: any) => {
            toast.error(err.message || 'Failed to update stock');
          },
        }
      );
    },
    [editValue, updateStock, cancelEdit]
  );

  // Adjust handlers
  const openAdjustModal = useCallback(
    (variantId: string, productName: string, variant: string, currentStock: number) => {
      setAdjustModal({ variantId, productName, variant, currentStock });
      setAdjustAmount('');
      setAdjustReason('');
    },
    []
  );

  const submitAdjust = useCallback(() => {
    if (!adjustModal) return;
    const adjustment = parseInt(adjustAmount, 10);
    if (isNaN(adjustment) || adjustment === 0) {
      toast.error('Adjustment must be a non-zero number');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }
    adjustStock.mutate(
      {
        variantId: adjustModal.variantId,
        adjustment,
        reason: adjustReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Stock adjusted successfully');
          setAdjustModal(null);
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to adjust stock');
        },
      }
    );
  }, [adjustModal, adjustAmount, adjustReason, adjustStock]);

  // Bulk update handlers
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
    if (selectedIds.size === variants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(variants.map((v: any) => v.id)));
    }
  }, [selectedIds.size, variants]);

  const openBulkModal = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.warning('Select at least one variant to bulk update');
      return;
    }
    setBulkStockValue('');
    setBulkModal(true);
  }, [selectedIds.size]);

  const submitBulkUpdate = useCallback(() => {
    const stock = parseInt(bulkStockValue, 10);
    if (isNaN(stock) || stock < 0) {
      toast.error('Stock must be a non-negative number');
      return;
    }
    const updates = Array.from(selectedIds).map((variantId) => ({
      variantId,
      stock,
    }));
    bulkUpdateStock.mutate(updates, {
      onSuccess: () => {
        toast.success(`Updated stock for ${updates.length} variant(s)`);
        setBulkModal(false);
        setSelectedIds(new Set());
      },
      onError: (err: any) => {
        toast.error(err.message || 'Failed to bulk update stock');
      },
    });
  }, [bulkStockValue, selectedIds, bulkUpdateStock]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Inventory</h1>
        <p className="text-sm text-medium-gray mt-1">Manage product stock levels and inventory</p>
      </div>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={String(summary?.totalProducts || 0)}
            change={`${summary?.totalVariants || 0} variants`}
            changeType="neutral"
            icon={Package}
          />
          <StatCard
            title="Total Stock"
            value={String(summary?.totalStock || 0)}
            change="units across all variants"
            changeType="neutral"
            icon={Boxes}
          />
          <StatCard
            title="Low Stock"
            value={String(summary?.lowStockCount || 0)}
            change="variants below threshold"
            changeType={summary?.lowStockCount > 0 ? 'negative' : 'positive'}
            icon={AlertTriangle}
          />
          <StatCard
            title="Out of Stock"
            value={String(summary?.outOfStockCount || 0)}
            change="variants with zero stock"
            changeType={summary?.outOfStockCount > 0 ? 'negative' : 'positive'}
            icon={XCircle}
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
            />
            <input
              type="text"
              placeholder="Search by product name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <Select
            options={filterOptions}
            value={lowStock}
            onChange={(e) => {
              setLowStock(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48"
          />
          <Select
            options={sortOptions}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-52"
          />
          {selectedIds.size > 0 && (
            <Button onClick={openBulkModal} size="sm">
              Bulk Update ({selectedIds.size})
            </Button>
          )}
        </div>
      </Card>

      {/* Inventory table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load inventory</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !variants.length ? (
          <div className="p-12 text-center">
            <Boxes size={40} className="mx-auto text-light-gray mb-3" />
            <p className="text-medium-gray">No inventory items found</p>
            <p className="text-sm text-medium-gray mt-1">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={variants.length > 0 && selectedIds.size === variants.length}
                        onChange={toggleSelectAll}
                        className="rounded border-light-gray text-deep-earth focus:ring-deep-earth/20"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-medium-gray">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-medium-gray">Variant</th>
                    <th className="text-left px-4 py-3 font-medium text-medium-gray">SKU</th>
                    <th className="text-left px-4 py-3 font-medium text-medium-gray">
                      Current Stock
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant: any) => {
                    const isEditing = editingId === variant.id;
                    const primaryImage = variant.product?.images?.[0];
                    const variantLabel = [variant.size, variant.color].filter(Boolean).join(' / ');

                    return (
                      <tr
                        key={variant.id}
                        className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(variant.id)}
                            onChange={() => toggleSelect(variant.id)}
                            className="rounded border-light-gray text-deep-earth focus:ring-deep-earth/20"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {primaryImage ? (
                              <img
                                src={primaryImage.url}
                                alt={primaryImage.altText || variant.product?.name}
                                className="w-9 h-9 rounded-md object-cover bg-off-white"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-off-white flex items-center justify-center">
                                <Package size={16} className="text-medium-gray" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-charcoal">{variant.product?.name}</p>
                              <p className="text-xs text-medium-gray">{variant.product?.status}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {variant.colorHex && (
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-light-gray"
                                style={{ backgroundColor: variant.colorHex }}
                              />
                            )}
                            <span className="text-dark-gray">{variantLabel || '--'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-dark-gray font-mono text-xs">
                            {variant.sku || '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(variant.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="w-20 px-2 py-1 rounded border border-deep-earth bg-white text-sm text-charcoal outline-none focus:ring-2 focus:ring-deep-earth/20"
                                autoFocus
                              />
                              <button
                                onClick={() => saveEdit(variant.id)}
                                disabled={updateStock.isPending}
                                className="p-1 rounded hover:bg-off-white text-success"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 rounded hover:bg-off-white text-error"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(variant.id, variant.stock)}
                              className="group flex items-center gap-1.5 cursor-pointer"
                              title="Click to edit stock"
                            >
                              <StockBadge stock={variant.stock} />
                              <Pencil
                                size={12}
                                className="text-medium-gray opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openAdjustModal(
                                  variant.id,
                                  variant.product?.name || 'Unknown',
                                  variantLabel,
                                  variant.stock
                                )
                              }
                            >
                              Adjust
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {page} of {totalPages} ({total} variants)
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
                    disabled={page >= totalPages}
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

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!adjustModal}
        onClose={() => setAdjustModal(null)}
        title="Adjust Stock"
        size="sm"
      >
        {adjustModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-charcoal font-medium">{adjustModal.productName}</p>
              <p className="text-xs text-medium-gray">{adjustModal.variant}</p>
              <p className="text-sm text-dark-gray mt-1">
                Current stock: <span className="font-semibold">{adjustModal.currentStock}</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">Adjustment</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const val = parseInt(adjustAmount, 10) || 0;
                    setAdjustAmount(String(val - 1));
                  }}
                  className="w-9 h-9 rounded-lg border border-light-gray bg-off-white flex items-center justify-center hover:bg-light-gray transition-colors"
                >
                  <Minus size={14} className="text-dark-gray" />
                </button>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. +10 or -5"
                  className="flex-1 px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal text-center outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
                <button
                  onClick={() => {
                    const val = parseInt(adjustAmount, 10) || 0;
                    setAdjustAmount(String(val + 1));
                  }}
                  className="w-9 h-9 rounded-lg border border-light-gray bg-off-white flex items-center justify-center hover:bg-light-gray transition-colors"
                >
                  <Plus size={14} className="text-dark-gray" />
                </button>
              </div>
              {adjustAmount && !isNaN(parseInt(adjustAmount, 10)) && (
                <p className="text-xs text-medium-gray mt-1">
                  New stock will be:{' '}
                  <span className="font-semibold">
                    {Math.max(0, adjustModal.currentStock + parseInt(adjustAmount, 10))}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-charcoal block mb-1">Reason</label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Received new shipment, Damaged goods, Inventory correction..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setAdjustModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitAdjust} disabled={adjustStock.isPending}>
                {adjustStock.isPending ? 'Saving...' : 'Apply Adjustment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Update Modal */}
      <Modal
        isOpen={bulkModal}
        onClose={() => setBulkModal(false)}
        title="Bulk Update Stock"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-dark-gray">
            Set the stock level for{' '}
            <span className="font-semibold text-charcoal">{selectedIds.size}</span> selected
            variant(s). This will replace their current stock values.
          </p>

          <div>
            <label className="text-sm font-medium text-charcoal block mb-1">New Stock Level</label>
            <input
              type="number"
              min="0"
              value={bulkStockValue}
              onChange={(e) => setBulkStockValue(e.target.value)}
              placeholder="Enter stock quantity..."
              className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setBulkModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitBulkUpdate} disabled={bulkUpdateStock.isPending}>
              {bulkUpdateStock.isPending ? 'Updating...' : `Update ${selectedIds.size} Variant(s)`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
