"use client";

import { useState } from "react";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import {
  useAddProductVariants,
  useUpdateProductVariant,
  useDeleteProductVariant,
} from "@/hooks/use-products";

interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string | null;
  price?: number | null;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

interface NewVariant {
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
}

const emptyVariant: NewVariant = {
  sku: "",
  size: "",
  color: "",
  colorHex: "",
  price: "",
  stock: "0",
  lowStockThreshold: "5",
};

interface VariantEditorProps {
  productId: string;
  variants: Variant[];
  basePrice: number;
}

export function VariantEditor({ productId, variants, basePrice }: VariantEditorProps) {
  const [newVariants, setNewVariants] = useState<NewVariant[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Variant>>({});

  const addVariants = useAddProductVariants();
  const updateVariant = useUpdateProductVariant();
  const deleteVariant = useDeleteProductVariant();

  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  const handleAddRow = () => {
    setNewVariants((prev) => [...prev, { ...emptyVariant }]);
  };

  const handleRemoveNewRow = (index: number) => {
    setNewVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewVariantChange = (index: number, field: keyof NewVariant, value: string) => {
    setNewVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleSaveNewVariants = async () => {
    const toCreate = newVariants
      .filter((v) => v.sku && v.size && v.color)
      .map((v) => ({
        sku: v.sku,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex || undefined,
        price: v.price ? parseFloat(v.price) : undefined,
        stock: parseInt(v.stock) || 0,
        lowStockThreshold: parseInt(v.lowStockThreshold) || 5,
        isActive: true,
      }));

    if (toCreate.length === 0) {
      toast.error("Fill in SKU, size, and color for at least one variant");
      return;
    }

    try {
      await addVariants.mutateAsync({ productId, variants: toCreate });
      toast.success(`${toCreate.length} variant(s) added`);
      setNewVariants([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add variants");
    }
  };

  const handleStartEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setEditData({
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      colorHex: variant.colorHex,
      price: variant.price,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateVariant.mutateAsync({ variantId: editingId, data: editData });
      toast.success("Variant updated");
      setEditingId(null);
      setEditData({});
    } catch (err: any) {
      toast.error(err.message || "Failed to update variant");
    }
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    try {
      await deleteVariant.mutateAsync(variantId);
      toast.success("Variant deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete variant");
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-charcoal">Variants</h3>
          <p className="text-xs text-medium-gray mt-0.5">
            {variants.length} variant{variants.length !== 1 ? "s" : ""} &middot; {totalStock} total stock
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleAddRow}>
          <Plus size={16} />
          Add Variant
        </Button>
      </div>

      {/* Existing variants */}
      {variants.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-gray">
                <th className="text-left py-2 px-2 font-medium text-medium-gray">SKU</th>
                <th className="text-left py-2 px-2 font-medium text-medium-gray">Size</th>
                <th className="text-left py-2 px-2 font-medium text-medium-gray">Color</th>
                <th className="text-right py-2 px-2 font-medium text-medium-gray">Price</th>
                <th className="text-right py-2 px-2 font-medium text-medium-gray">Stock</th>
                <th className="text-right py-2 px-2 font-medium text-medium-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className="border-b border-light-gray last:border-0 hover:bg-off-white/50">
                  {editingId === variant.id ? (
                    <>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editData.sku || ""}
                          onChange={(e) => setEditData((d) => ({ ...d, sku: e.target.value }))}
                          className="w-full px-2 py-1 h-7 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={editData.size || ""}
                          onChange={(e) => setEditData((d) => ({ ...d, size: e.target.value }))}
                          className="w-full px-2 py-1 h-7 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editData.color || ""}
                            onChange={(e) => setEditData((d) => ({ ...d, color: e.target.value }))}
                            className="flex-1 px-2 py-1 h-7 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                          />
                          <input
                            type="color"
                            value={editData.colorHex || "#000000"}
                            onChange={(e) => setEditData((d) => ({ ...d, colorHex: e.target.value }))}
                            className="w-7 h-7 rounded border border-light-gray cursor-pointer"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={editData.price ?? ""}
                          onChange={(e) => setEditData((d) => ({ ...d, price: e.target.value ? parseFloat(e.target.value) : null }))}
                          placeholder={String(basePrice)}
                          className="w-20 px-2 py-1 h-7 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={editData.stock ?? 0}
                          onChange={(e) => setEditData((d) => ({ ...d, stock: parseInt(e.target.value) || 0 }))}
                          className="w-16 px-2 py-1 h-7 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updateVariant.isPending}
                            className="p-1 rounded hover:bg-forest-green/10 text-forest-green"
                            title="Save"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded hover:bg-off-white text-medium-gray"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-2 text-charcoal font-mono text-xs">{variant.sku}</td>
                      <td className="py-2 px-2 text-charcoal">{variant.size}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          {variant.colorHex && (
                            <span
                              className="inline-block w-3 h-3 rounded-full border border-light-gray"
                              style={{ backgroundColor: variant.colorHex }}
                            />
                          )}
                          <span className="text-charcoal">{variant.color}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-charcoal">
                        {variant.price ? `$${Number(variant.price).toFixed(0)}` : "\u2014"}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={variant.stock <= variant.lowStockThreshold ? "text-error font-medium" : "text-charcoal"}>
                          {variant.stock}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEdit(variant)}
                            className="p-1 rounded hover:bg-off-white text-dark-gray"
                            title="Edit variant"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(variant.id)}
                            className="p-1 rounded hover:bg-error/10 text-error"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New variant rows */}
      {newVariants.length > 0 && (
        <div className="space-y-3 border-t border-light-gray pt-4">
          <p className="text-xs font-medium text-medium-gray uppercase tracking-wide">
            New Variants
          </p>
          {newVariants.map((nv, index) => (
            <div key={index} className="grid grid-cols-6 gap-2 items-end">
              <div>
                <label className="text-xs text-medium-gray">SKU</label>
                <input
                  type="text"
                  value={nv.sku}
                  onChange={(e) => handleNewVariantChange(index, "sku", e.target.value)}
                  placeholder="ER-001-S-BLK"
                  className="w-full px-2 py-1 h-8 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                />
              </div>
              <div>
                <label className="text-xs text-medium-gray">Size</label>
                <input
                  type="text"
                  value={nv.size}
                  onChange={(e) => handleNewVariantChange(index, "size", e.target.value)}
                  placeholder="S"
                  className="w-full px-2 py-1 h-8 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                />
              </div>
              <div>
                <label className="text-xs text-medium-gray">Color</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nv.color}
                    onChange={(e) => handleNewVariantChange(index, "color", e.target.value)}
                    placeholder="Black"
                    className="flex-1 px-2 py-1 h-8 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                  />
                  <input
                    type="color"
                    value={nv.colorHex || "#000000"}
                    onChange={(e) => handleNewVariantChange(index, "colorHex", e.target.value)}
                    className="w-8 h-8 rounded border border-light-gray cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-medium-gray">Price Override</label>
                <input
                  type="number"
                  value={nv.price}
                  onChange={(e) => handleNewVariantChange(index, "price", e.target.value)}
                  placeholder={String(basePrice)}
                  className="w-full px-2 py-1 h-8 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                />
              </div>
              <div>
                <label className="text-xs text-medium-gray">Stock</label>
                <input
                  type="number"
                  value={nv.stock}
                  onChange={(e) => handleNewVariantChange(index, "stock", e.target.value)}
                  className="w-full px-2 py-1 h-8 text-xs rounded border border-light-gray bg-white outline-none focus:border-deep-earth"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveNewRow(index)}
                  className="p-1.5 rounded hover:bg-error/10 text-error"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewVariants([])}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewVariants}
              isLoading={addVariants.isPending}
            >
              Save {newVariants.length} Variant{newVariants.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {variants.length === 0 && newVariants.length === 0 && (
        <div className="text-center py-6 border border-dashed border-light-gray rounded-lg">
          <p className="text-sm text-medium-gray mb-2">No variants yet</p>
          <Button variant="ghost" size="sm" onClick={handleAddRow}>
            <Plus size={16} />
            Add First Variant
          </Button>
        </div>
      )}
    </Card>
  );
}
