"use client";

interface Variant {
  id: string;
  size: string;
  color: string;
  colorHex?: string | null;
  stock: number;
  price?: number | string | null;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedSize: string | null;
  selectedColor: string | null;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
}

export function VariantSelector({
  variants,
  selectedSize,
  selectedColor,
  onSizeChange,
  onColorChange,
}: VariantSelectorProps) {
  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Map(variants.map((v) => [v.color, { name: v.color, hex: v.colorHex }])).values()];

  const isAvailable = (size: string, color: string) => {
    const variant = variants.find((v) => v.size === size && v.color === color);
    return variant ? variant.stock > 0 : false;
  };

  const isSizeAvailable = (size: string) => {
    if (!selectedColor) return variants.some((v) => v.size === size && v.stock > 0);
    return isAvailable(size, selectedColor);
  };

  const isColorAvailable = (color: string) => {
    if (!selectedSize) return variants.some((v) => v.color === color && v.stock > 0);
    return isAvailable(selectedSize, color);
  };

  const selectedVariant = selectedSize && selectedColor
    ? variants.find((v) => v.size === selectedSize && v.color === selectedColor)
    : null;

  return (
    <div className="space-y-5">
      {/* Color selector */}
      {colors.length > 1 && (
        <div>
          <p className="text-[11px] tracking-[0.04em] text-slate-900 mb-3">
            <span className="text-slate-500">Color:</span>{" "}
            <span className="font-medium">{selectedColor || "—"}</span>
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {colors.map((color) => {
              const available = isColorAvailable(color.name);
              const selected = selectedColor === color.name;
              return (
                <button
                  key={color.name}
                  onClick={() => onColorChange(color.name)}
                  disabled={!available}
                  title={color.name}
                  className={`w-11 h-11 border-2 transition-all relative ${
                    selected ? "border-black scale-110" : "border-slate-200"
                  } ${!available ? "opacity-25 cursor-not-allowed" : "hover:border-slate-400"}`}
                >
                  <span
                    className="block w-full h-full"
                    style={{ backgroundColor: color.hex || "#ccc" }}
                  />
                  {!available && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-[1px] h-full bg-slate-400 rotate-45 absolute" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size selector */}
      <div>
        <p className="text-[11px] tracking-[0.04em] text-slate-900 mb-3">
          <span className="text-slate-500">Size:</span>{" "}
          <span className="font-medium">{selectedSize || "—"}</span>
        </p>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((size) => {
            const available = isSizeAvailable(size);
            const selected = selectedSize === size;
            return (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                disabled={!available}
                className={`h-11 min-h-[44px] text-[11px] font-medium tracking-[0.04em] uppercase border text-center transition-all ${
                  selected
                    ? "bg-black text-white border-black"
                    : available
                      ? "border-slate-200 text-slate-800 hover:border-black"
                      : "border-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock status */}
      {selectedVariant && (
        <p className={`text-[11px] ${selectedVariant.stock > 5 ? "text-slate-600" : selectedVariant.stock > 0 ? "text-amber-600" : "text-red-500"}`}>
          {selectedVariant.stock > 5
            ? "In Stock"
            : selectedVariant.stock > 0
              ? `Only ${selectedVariant.stock} left`
              : "Out of Stock"}
        </p>
      )}
    </div>
  );
}
