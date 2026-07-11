// Generic first-wins dedupe by a derived key — used by
// knowledge/profileMerger.ts to union lists of structured objects
// (RevenueStream, Expense, FinancialRisk). A local copy, not imported
// from lib/market's equivalent — that isn't part of lib/market's public
// barrel, and this milestone's rule is "consume only public exports."
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
