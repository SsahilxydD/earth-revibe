import { describe, it, expect } from 'vitest';
import {
  comboDiscount,
  discountPctFor,
  byoSlugFor,
  type ComboDiscountInput,
} from '@earth-revibe/shared';

const aLaCarte = (price: number, quantity = 1): ComboDiscountInput => ({ price, quantity });

const comboItem = (
  price: number,
  comboSlug: string,
  comboGroupId: string,
  quantity = 1
): ComboDiscountInput => ({ price, quantity, comboSlug, comboGroupId });

describe('discountPctFor — curated ladder', () => {
  it('returns 0% for fewer than 3 pieces', () => {
    expect(discountPctFor(0, 'curated')).toBe(0);
    expect(discountPctFor(2, 'curated')).toBe(0);
  });

  it('returns 20% for 3-4 pieces', () => {
    expect(discountPctFor(3, 'curated')).toBe(20);
    expect(discountPctFor(4, 'curated')).toBe(20);
  });

  it('returns 25% for 5-6 pieces', () => {
    expect(discountPctFor(5, 'curated')).toBe(25);
    expect(discountPctFor(6, 'curated')).toBe(25);
  });

  it('returns 30% for 7+ pieces', () => {
    expect(discountPctFor(7, 'curated')).toBe(30);
    expect(discountPctFor(99, 'curated')).toBe(30);
  });
});

describe('discountPctFor — BYO ladder', () => {
  it('returns 0% for fewer than 3 pieces', () => {
    expect(discountPctFor(2, 'byo')).toBe(0);
  });

  it('returns 17% for 3-4 pieces', () => {
    expect(discountPctFor(3, 'byo')).toBe(17);
    expect(discountPctFor(4, 'byo')).toBe(17);
  });

  it('returns 22% for 5-6 pieces', () => {
    expect(discountPctFor(5, 'byo')).toBe(22);
    expect(discountPctFor(6, 'byo')).toBe(22);
  });

  it('returns 27% for 7+ pieces', () => {
    expect(discountPctFor(7, 'byo')).toBe(27);
  });
});

describe('discountPctFor — curated always beats BYO at the same pieceCount', () => {
  it.each([3, 4, 5, 6, 7])('curated > byo at %i pieces', (n) => {
    expect(discountPctFor(n, 'curated')).toBeGreaterThan(discountPctFor(n, 'byo'));
  });
});

describe('comboDiscount — à la carte cart leak prevention', () => {
  it('returns 0 for an empty cart', () => {
    expect(comboDiscount([]).total).toBe(0);
  });

  it('returns 0 for a 5-item cart with no combo tokens (the de-leak)', () => {
    const items = Array.from({ length: 5 }, () => aLaCarte(1000));
    expect(comboDiscount(items).total).toBe(0);
  });

  it('returns 0 for a 7-item cart with no combo tokens', () => {
    const items = Array.from({ length: 7 }, () => aLaCarte(800));
    expect(comboDiscount(items).total).toBe(0);
  });
});

describe('comboDiscount — curated combos use curated ladder', () => {
  it('applies 20% to a complete 3-piece Salt Pack', () => {
    const items = Array.from({ length: 3 }, () => comboItem(1000, 'salt-pack', 'g1'));
    expect(comboDiscount(items).total).toBe(600); // 20% of 3000
  });

  it('applies 25% to a complete 5-piece Above the Fold', () => {
    const items = Array.from({ length: 5 }, () => comboItem(2000, 'above-the-fold', 'g2'));
    expect(comboDiscount(items).total).toBe(2500); // 25% of 10000
  });

  it('applies 30% to a complete 7-piece Touch-and-Go', () => {
    const items = Array.from({ length: 7 }, () => comboItem(1500, 'touch-and-go', 'g3'));
    expect(comboDiscount(items).total).toBeCloseTo(3150); // 30% of 10500
  });

  it('drops the discount when a piece is missing (broken kit)', () => {
    // Salt Pack expects 3 pieces; cart has 2 with the salt-pack token
    const items = Array.from({ length: 2 }, () => comboItem(1000, 'salt-pack', 'g1'));
    expect(comboDiscount(items).total).toBe(0);
  });

  it('ignores an unknown comboSlug', () => {
    const items = Array.from({ length: 3 }, () => comboItem(1000, 'not-a-real-combo', 'g1'));
    expect(comboDiscount(items).total).toBe(0);
  });

  it('prices two of the same combo independently when groupIds differ', () => {
    const items = [
      comboItem(1000, 'salt-pack', 'gA'),
      comboItem(1000, 'salt-pack', 'gA'),
      comboItem(1000, 'salt-pack', 'gA'),
      comboItem(1200, 'salt-pack', 'gB'),
      comboItem(1200, 'salt-pack', 'gB'),
      comboItem(1200, 'salt-pack', 'gB'),
    ];
    const r = comboDiscount(items);
    // 20% of 3000 + 20% of 3600 = 600 + 720 = 1320
    expect(r.total).toBe(1320);
    expect(r.groups).toHaveLength(2);
  });
});

describe('comboDiscount — BYO kits use BYO ladder', () => {
  it('applies 17% to a 3-piece BYO kit', () => {
    const slug = byoSlugFor(3);
    const items = Array.from({ length: 3 }, () => comboItem(1000, slug, 'byo-1'));
    expect(comboDiscount(items).total).toBe(510); // 17% of 3000
  });

  it('applies 22% to a 5-piece BYO kit', () => {
    const slug = byoSlugFor(5);
    const items = Array.from({ length: 5 }, () => comboItem(900, slug, 'byo-2'));
    expect(comboDiscount(items).total).toBeCloseTo(990); // 22% of 4500
  });

  it('applies 27% to a 7-piece BYO kit', () => {
    const slug = byoSlugFor(7);
    const items = Array.from({ length: 7 }, () => comboItem(1000, slug, 'byo-3'));
    expect(comboDiscount(items).total).toBe(1890); // 27% of 7000
  });

  it('drops the discount when a BYO group has fewer than 3 pieces', () => {
    const slug = byoSlugFor(3);
    const items = [comboItem(1000, slug, 'byo-1'), comboItem(1000, slug, 'byo-1')];
    expect(comboDiscount(items).total).toBe(0);
  });
});

describe('comboDiscount — mixed cart', () => {
  it('discounts only the combo group, leaves à la carte items at full price', () => {
    const items = [
      // Complete Salt Pack
      ...Array.from({ length: 3 }, () => comboItem(1000, 'salt-pack', 'g1')),
      // À la carte additions
      aLaCarte(2000),
      aLaCarte(500),
    ];
    expect(comboDiscount(items).total).toBe(600); // only 20% of the 3000 combo subtotal
  });

  it('a curated 5-piece kit beats a BYO 5-piece kit at the same prices', () => {
    const curated = Array.from({ length: 5 }, () => comboItem(1000, 'above-the-fold', 'gC'));
    const byo = Array.from({ length: 5 }, () => comboItem(1000, byoSlugFor(5), 'gB'));
    const curatedTotal = comboDiscount(curated).total;
    const byoTotal = comboDiscount(byo).total;
    expect(curatedTotal).toBeGreaterThan(byoTotal);
    expect(curatedTotal).toBe(1250); // 25% of 5000
    expect(byoTotal).toBeCloseTo(1100); // 22% of 5000
  });
});
