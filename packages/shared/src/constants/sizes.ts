export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const SIZE_LABELS: Record<ProductSize, string> = {
  XS: "Extra Small",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
  XXL: "Double Extra Large",
};
