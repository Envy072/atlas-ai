// Generic first-wins dedupe by a derived key — used by
// evidence/evidenceAggregator.ts and recommendations/recommendationAggregator.ts.
// A local copy, not imported from any upstream platform's equivalent —
// none re-export this from their public barrels, and this milestone's
// rule is "consume only public exports." (This exact duplication across
// five platforms is a known, documented piece of technical debt — see
// ARCHITECTURE_REVIEW.md Technical Debt #1 — worth consolidating into a
// shared module in a future pass, not something this review-constrained
// milestone changes unilaterally.)
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
