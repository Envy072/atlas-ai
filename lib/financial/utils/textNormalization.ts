// Lowercases, trims, and collapses whitespace — used to dedupe/compare
// named list items (revenue streams, expenses, risks) case-insensitively.
export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
