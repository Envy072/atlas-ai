// A small, self-contained URL helper for this module — deliberately not
// imported from lib/research's or lib/competitors' internal normalization
// utils, neither of which re-exports this from its public barrel. Same
// precedent lib/competitors set for itself relative to lib/research.
export function urlDedupeKey(rawUrl: string): string {
  const trimmed = rawUrl.trim().toLowerCase();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
