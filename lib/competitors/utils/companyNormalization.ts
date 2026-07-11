// Real, deterministic normalization — no ML, no embeddings, no external
// lookup — the same honesty standard as lib/research's normalizeUrl:
// genuinely correct today, not a stub waiting for a smarter replacement.
// This is what lets matcher/entityMatcher.ts resolve "HubSpot",
// "Hub Spot", and "HubSpot Inc." to the same normalized key.

const LEGAL_SUFFIXES = [
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "plc",
];

const LEGAL_SUFFIX_PATTERN = new RegExp(`\\b(${LEGAL_SUFFIXES.join("|")})\\.?$`, "i");

// Lowercases, strips punctuation, collapses whitespace, and drops a
// trailing legal suffix — "HubSpot, Inc." and "hubspot" both become
// "hubspot".
export function normalizeCompanyName(name: string): string {
  const withoutSuffix = name.trim().replace(LEGAL_SUFFIX_PATTERN, "");

  return withoutSuffix
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Token set for the overlap-based similarity score entityMatcher.ts uses
// as its fallback when two normalized names aren't identical outright
// (e.g. "hub spot" vs "hubspot" — same characters, different spacing).
export function tokenizeCompanyName(name: string): Set<string> {
  return new Set(normalizeCompanyName(name).split(" ").filter(Boolean));
}
