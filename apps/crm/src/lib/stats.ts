// Two-proportion z-test (equivalent to 2x2 chi-squared) for the
// /templates dashboard's significance check. We compare read rates
// pairwise: p_baseline vs p_variant. Pure-TS, no math libs.
//
// Math:
//   p1 = successes_1 / trials_1
//   p2 = successes_2 / trials_2
//   pooled = (s1 + s2) / (n1 + n2)
//   se = sqrt(pooled * (1 - pooled) * (1/n1 + 1/n2))
//   z = (p1 - p2) / se
//   p-value = 2 * (1 - Φ(|z|))
//
// Φ (standard-normal CDF) is approximated via erf using Abramowitz &
// Stegun 7.1.26 — accurate to ~1.5e-7 which is way past what funnel
// significance needs.

const MIN_SAMPLE = 30; // below this, the normal approximation isn't trustworthy
const SIG_THRESHOLD = 0.05;

interface CompareInput {
  trialsA: number;
  successesA: number;
  trialsB: number;
  successesB: number;
}

export interface CompareResult {
  /// True if both variants have ≥30 trials AND p < 0.05.
  significant: boolean;
  /// Two-sided p-value, or null if either sample is too small to test.
  pValue: number | null;
  /// Conversion rates as fractions (0–1).
  rateA: number;
  rateB: number;
  /// "B-A" lift as a fraction (positive = B better). Null if either rate is undefined.
  lift: number | null;
}

export function compareProportions(input: CompareInput): CompareResult {
  const { trialsA, successesA, trialsB, successesB } = input;
  const rateA = trialsA > 0 ? successesA / trialsA : 0;
  const rateB = trialsB > 0 ? successesB / trialsB : 0;
  const lift = trialsA > 0 && trialsB > 0 ? rateB - rateA : null;

  if (trialsA < MIN_SAMPLE || trialsB < MIN_SAMPLE) {
    return { significant: false, pValue: null, rateA, rateB, lift };
  }

  const pooled = (successesA + successesB) / (trialsA + trialsB);
  const variance = pooled * (1 - pooled) * (1 / trialsA + 1 / trialsB);
  if (variance <= 0) {
    return { significant: false, pValue: 1, rateA, rateB, lift };
  }
  const z = (rateB - rateA) / Math.sqrt(variance);
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    significant: pValue < SIG_THRESHOLD,
    pValue,
    rateA,
    rateB,
    lift,
  };
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Abramowitz & Stegun 7.1.26
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function formatPValue(p: number | null): string {
  if (p === null) return '—';
  if (p < 0.0001) return 'p<0.0001';
  if (p < 0.001) return `p=${p.toFixed(4)}`;
  return `p=${p.toFixed(3)}`;
}
