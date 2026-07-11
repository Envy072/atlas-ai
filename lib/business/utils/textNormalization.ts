// Lowercases, trims, and collapses whitespace — used to dedupe/compare
// named list items (dependencies, operational risks, customer segments)
// case-insensitively.
export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
