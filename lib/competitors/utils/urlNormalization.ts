// A small, self-contained URL helper for this module. Deliberately not
// imported from lib/research/utils/normalization.ts — this milestone's
// rule is "only consume public exports" from the frozen lib/research/
// tree, and that internal util isn't re-exported from lib/research's
// public barrel (lib/research/index.ts), so this platform owns its own
// minimal copy rather than reaching past the boundary.
export function extractCompanyDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

// Case/trailing-slash-insensitive key for deduplicating a list of items
// that each carry a `url` field — used by knowledge/profileMerger.ts to
// keep a merged profile's sources list free of exact re-fetches of the
// same page across successive refreshes.
export function urlDedupeKey(rawUrl: string): string {
  const trimmed = rawUrl.trim().toLowerCase();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
