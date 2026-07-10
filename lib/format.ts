// Small display-formatting helpers shared across score/metric UI so the
// "/100" and "%" conventions live in one place instead of being retyped
// inline at every call site.
export function formatScore(score: number, max = 100): string {
  return `${score}/${max}`;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}
