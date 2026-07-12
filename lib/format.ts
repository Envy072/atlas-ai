// Small display-formatting helpers shared across score/metric UI so the
// "/100" and "%" conventions live in one place instead of being retyped
// inline at every call site.
export function formatScore(score: number, max = 100): string {
  return `${score}/${max}`;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

// Formats a raw USD figure ($1,200,000,000) as "$1.2B" — for market-size
// and financial estimates, which are routinely too large to read as a
// literal number.
export function formatCurrencyUsd(valueUsd: number): string {
  return compactUsdFormatter.format(valueUsd);
}

const RELATIVE_TIME_UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 604800, divisor: 86400, unit: "day" },
  { limit: 2629800, divisor: 604800, unit: "week" },
  { limit: 31557600, divisor: 2629800, unit: "month" },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Formats an ISO timestamp as "2 hours ago" style relative text, for
// Recent Projects / Recent Activity style panels.
export function formatRelativeTime(isoDate: string): string {
  const elapsedSeconds = (Date.parse(isoDate) - Date.now()) / 1000;
  const absSeconds = Math.abs(elapsedSeconds);

  for (const { limit, divisor, unit } of RELATIVE_TIME_UNITS) {
    if (absSeconds < limit) {
      return relativeTimeFormatter.format(Math.round(elapsedSeconds / divisor), unit);
    }
  }

  return relativeTimeFormatter.format(Math.round(elapsedSeconds / 31557600), "year");
}
