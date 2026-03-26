export const PRODUCT_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Forest Green', hex: '#2D5016' },
  { name: 'Olive', hex: '#556B2F' },
  { name: 'Sand', hex: '#D4C5A9' },
  { name: 'Terracotta', hex: '#C67B5C' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Rust', hex: '#B7410E' },
  { name: 'Sage', hex: '#87A878' },
  { name: 'Clay', hex: '#8B6F47' },
  { name: 'Indigo', hex: '#3F51B5' },
  { name: 'Burgundy', hex: '#800020' },
] as const;

export type ProductColor = (typeof PRODUCT_COLORS)[number]['name'];
