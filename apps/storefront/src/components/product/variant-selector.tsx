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
  // Get unique sizes and colors
  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Map(variants.map((v) => [v.color, { name: v.color, hex: v.colorHex }])).values()];

  // Check if a specific size+color combo is available
  const isAvailable = (size: string, color: string) => {
    const variant = variants.find((v) => v.size === size && v.color === color);
    return variant ? variant.stock > 0 : false;
  };

  // Check if a size has any available stock (across all colors)
  const isSizeAvailable = (size: string) => {
    if (!selectedColor) return variants.some((v) => v.size === size && v.stock > 0);
    return isAvailable(size, selectedColor);
  };

  // Check if a color has any available stock (across all sizes)
  const isColorAvailable = (color: string) => {
    if (!selectedSize) return variants.some((v) => v.color === color && v.stock > 0);
    return isAvailable(selectedSize, color);
  };

  // Get selected variant
  const selectedVariant = selectedSize && selectedColor
    ? variants.find((v) => v.size === selectedSize && v.color === selectedColor)
    : null;

  return (
    <div className="space-y-5">
      {/* Color selector */}
      <div>
        <label className="text-sm font-medium text-charcoal mb-2 block">
          Color: <span className="text-medium-gray font-normal">{selectedColor || "Select"}</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => {
            const available = isColorAvailable(color.name);
            const selected = selectedColor === color.name;
            return (
              <button
                key={color.name}
                onClick={() => onColorChange(color.name)}
                disabled={!available}
                title={color.name}
                className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                  selected ? "border-forest-green ring-2 ring-forest-green/20" : "border-light-gray"
                } ${!available ? "opacity-30 cursor-not-allowed" : "hover:border-sage"}`}
              >
                <span
                  className="block w-full h-full rounded-full"
                  style={{ backgroundColor: color.hex || "#ccc" }}
                />
                {!available && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-[1px] h-full bg-medium-gray rotate-45 absolute" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size selector */}
      <div>
        <label className="text-sm font-medium text-charcoal mb-2 block">
          Size: <span className="text-medium-gray font-normal">{selectedSize || "Select"}</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {sizes.map((size) => {
            const available = isSizeAvailable(size);
            const selected = selectedSize === size;
            return (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                disabled={!available}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  selected
                    ? "bg-forest-green text-white border-forest-green"
                    : available
                      ? "border-light-gray text-charcoal hover:border-forest-green"
                      : "border-light-gray text-medium-gray bg-off-white cursor-not-allowed line-through"
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
        <p className={`text-sm ${selectedVariant.stock > 5 ? "text-success" : selectedVariant.stock > 0 ? "text-warning" : "text-error"}`}>
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
