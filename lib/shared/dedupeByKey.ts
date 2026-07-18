// Generic first-wins dedupe by a derived key (Milestone 51) — the
// single shared implementation for what was previously four
// byte-identical copies (lib/financial, lib/business, lib/decision,
// lib/market's own utils/dedupeByKey.ts, each written independently
// under the "consume only public exports" constraint their own
// milestones worked under). Verified byte-identical before
// consolidation — see MILESTONE_51_DESIGN.md — so every existing
// caller's behavior is unchanged.
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
