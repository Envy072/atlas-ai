// Small display-formatting helpers shared across score/metric UI so the
// "/100" and "%" conventions live in one place instead of being retyped
// inline at every call site.
export function formatScore(score: number, max = 100): string {
  return `${score}/${max}`;
}

// The one, shared derivation of a display name from an email address
// (MILESTONE_28_DESIGN.md Deliverable 1) — used identically by
// ProfileMenu and DashboardWelcome's caller, never re-implemented at
// either call site. Deliberately mechanical (the email's local-part,
// e.g. "eshagy7" from "eshagy7@gmail.com"): no real name is collected
// or stored anywhere (see MILESTONE_28_DESIGN.md's "Future Identity"
// section) — this is a placeholder, not a profile feature.
export function formatDisplayName(email: string): string {
  return email.split("@")[0] || email;
}

// Validates a `redirectTo` value before it's ever used in a client-side
// navigation (MILESTONE_28_DESIGN.md Deliverable 6, Section 9 Security
// Review) — the shared check used identically by /login and /signup, so
// this open-redirect guard exists in exactly one place, not two. Not
// really "formatting," but this file is where CLAUDE.md's own Folder
// Rules point feature-specific logic that isn't a generic cn()-style
// utility (lib/utils.ts explicitly excludes that) and isn't a server-only
// concern (lib/services/auth.ts imports next/headers transitively,
// which would break bundling if a "use client" page imported it here).
//
// A safe value must be a genuine, same-origin relative path: a single
// leading "/", never "//" (protocol-relative — an open-redirect vector)
// or "/\" (a known backslash-normalization bypass for the same class of
// check), and never containing "://" anywhere (rejects an absolute URL
// smuggled in). Anything else — including a missing value — falls back
// to `fallback`.
export function getSafeRedirectPath(path: string | null, fallback: string): string {
  const isSafe =
    !!path &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\") &&
    !path.includes("://");

  return isSafe ? path : fallback;
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

const dateFormatter = new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" });

// Formats an ISO timestamp as "August 17, 2026" — an absolute date, for
// contexts where "in 12 days" (formatRelativeTime's own job) is less
// useful than the real calendar date, e.g. a subscription's renewal
// date (Milestone 45's Billing page).
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}
