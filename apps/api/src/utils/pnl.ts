/**
 * Pure profit-and-loss math, factored out of the analytics service so it can be
 * unit-tested without a database. Margins are percentages of revenue and guard
 * against divide-by-zero (no revenue → 0% rather than NaN/Infinity).
 */
export interface PnlInput {
  revenue: number;
  cogs: number;
  expensesTotal: number;
}

export interface PnlResult {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number; // %
  expensesTotal: number;
  netProfit: number;
  netMargin: number; // %
}

export function computePnl({ revenue, cogs, expensesTotal }: PnlInput): PnlResult {
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expensesTotal;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { revenue, cogs, grossProfit, grossMargin, expensesTotal, netProfit, netMargin };
}
