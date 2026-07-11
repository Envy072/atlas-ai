// Real, pure helpers — no external dependency needed to be genuinely
// correct today, the same standard lib/research's normalizeUrl and
// lib/competitors' normalizeCompanyName hold themselves to.

// Lowercases, trims, and collapses whitespace — the same industry label
// shouldn't produce a storage lookup miss just because of incidental
// casing/spacing differences ("FinTech" vs "fintech ").
export function normalizeIndustryName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// Token set for keyword-overlap heuristics (classification/industryClassifier.ts).
// A local copy, not imported from lib/research/ranking's equivalent — that
// isn't part of lib/research's public barrel, and this milestone's rule is
// "consume only public exports."
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
  );
}
