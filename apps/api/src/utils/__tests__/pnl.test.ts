import { describe, it, expect } from 'vitest';
import { computePnl } from '../pnl';

describe('computePnl', () => {
  it('computes gross/net profit and margins', () => {
    const r = computePnl({ revenue: 1000, cogs: 400, expensesTotal: 200 });
    expect(r.grossProfit).toBe(600);
    expect(r.netProfit).toBe(400);
    expect(r.grossMargin).toBeCloseTo(60);
    expect(r.netMargin).toBeCloseTo(40);
  });

  it('guards divide-by-zero when revenue is 0 (no NaN/Infinity)', () => {
    const r = computePnl({ revenue: 0, cogs: 0, expensesTotal: 100 });
    expect(r.grossMargin).toBe(0);
    expect(r.netMargin).toBe(0);
    expect(r.grossProfit).toBe(0);
    expect(r.netProfit).toBe(-100);
  });

  it('allows a negative net profit (expenses exceed gross)', () => {
    const r = computePnl({ revenue: 500, cogs: 300, expensesTotal: 400 });
    expect(r.grossProfit).toBe(200);
    expect(r.netProfit).toBe(-200);
    expect(r.netMargin).toBeCloseTo(-40);
  });

  it('passes through revenue/cogs/expenses untouched', () => {
    const r = computePnl({ revenue: 1234, cogs: 567, expensesTotal: 89 });
    expect(r.revenue).toBe(1234);
    expect(r.cogs).toBe(567);
    expect(r.expensesTotal).toBe(89);
  });
});
