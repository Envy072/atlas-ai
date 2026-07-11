// Generic first-wins dedupe by a derived key — used by
// knowledge/profileMerger.ts to union lists of structured objects
// (CustomerSegment, GeographicMarket, MarketTrend, Regulation, MarketRisk)
// without repeating the same seen-set loop five times.
export function dedupeByKey<TItem>(items: TItem[], keyFn: (item: TItem) => string): TItem[] {
  const seen = new Set<string>();
  const deduped: TItem[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}
