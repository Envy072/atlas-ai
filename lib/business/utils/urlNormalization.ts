// A small, self-contained URL helper for this module — deliberately not
// imported from any upstream platform's internal normalization utils,
// none of which re-export this from their public barrels. Same precedent
// each prior platform set for itself.
export function urlDedupeKey(rawUrl: string): string {
  const trimmed = rawUrl.trim().toLowerCase();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
