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
