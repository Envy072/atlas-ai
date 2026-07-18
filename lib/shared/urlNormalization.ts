// Case/trailing-slash-insensitive key for deduplicating a list of items
// that each carry a URL (Milestone 51) — the single shared
// implementation for what was previously five byte-identical copies
// (lib/financial, lib/business, lib/decision, lib/market's own
// utils/urlNormalization.ts, plus lib/competitors', which lived
// alongside its own, genuinely different extractCompanyDomain — left
// exactly where it is, untouched). Verified byte-identical before
// consolidation — see MILESTONE_51_DESIGN.md — so every existing
// caller's behavior is unchanged. Deliberately simpler than
// lib/research/utils/normalization.ts's own normalizeUrl() (which also
// strips tracking params and hashes) — that is a different, more
// thorough implementation for a different purpose, not a sixth copy of
// this one.
export function urlDedupeKey(rawUrl: string): string {
  const trimmed = rawUrl.trim().toLowerCase();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
