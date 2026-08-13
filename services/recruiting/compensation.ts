export interface CompensationObservation {
  source: string;
  title: string;
  location?: string;
  level?: string;
  cashMin?: number;
  cashMedian?: number;
  cashMax?: number;
  totalMin?: number;
  totalMedian?: number;
  totalMax?: number;
  currency: string;
  capturedAt: string;
}

export interface CompensationRecommendation {
  currency: string;
  marketP25?: number;
  marketP50?: number;
  marketP75?: number;
  internalP50?: number;
  recommendedBase: number;
  recommendedTotal: number;
  confidence: number;
  rationale: string[];
  sourceCount: number;
}

const percentile = (values: number[], p: number) => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

export function recommendCompensation(observations: CompensationObservation[], internalComparable?: number): CompensationRecommendation {
  const medians = observations.map(o => o.totalMedian ?? o.cashMedian).filter((v): v is number => typeof v === 'number' && v > 0);
  const bases = observations.map(o => o.cashMedian).filter((v): v is number => typeof v === 'number' && v > 0);
  const marketP25 = percentile(medians, 0.25);
  const marketP50 = percentile(medians, 0.5);
  const marketP75 = percentile(medians, 0.75);
  const baseP50 = percentile(bases, 0.5) ?? marketP50 ?? internalComparable ?? 0;
  const blended = marketP50 && internalComparable ? marketP50 * 0.65 + internalComparable * 0.35 : marketP50 ?? internalComparable ?? 0;
  const recommendedBase = Math.round((baseP50 || blended) * 100) / 100;
  const recommendedTotal = Math.round(blended * 100) / 100;
  return {
    currency: observations[0]?.currency || 'INR',
    marketP25,
    marketP50,
    marketP75,
    internalP50: internalComparable,
    recommendedBase,
    recommendedTotal,
    confidence: Math.min(0.95, 0.45 + observations.length * 0.05),
    rationale: [
      'Balances market benchmark evidence with internal parity when available.',
      internalComparable ? 'Internal comparable compensation was included.' : 'No internal comparable was supplied.',
      `${observations.length} compensation observations contributed to the recommendation.`,
    ],
    sourceCount: observations.length,
  };
}
