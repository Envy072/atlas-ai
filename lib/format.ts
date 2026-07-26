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

// Milestone 120 — Supabase's own password-recovery redirect surfaces a
// failure (an expired or already-used link) as an `error`/`error_code`
// param, in either the URL's query string (PKCE flow) or its hash
// fragment (implicit flow) depending on this project's own Auth
// settings — never reliably just one, so /reset-password checks both
// rather than assuming a specific flow. This never parses or trusts a
// token itself (no custom token implementation, per this milestone's
// own design constraint): it only detects whether Supabase's own
// redirect already flagged a failure, so the page can show one honest,
// friendly message instead of a broken form or Supabase's own raw
// error text verbatim.
export function isPasswordRecoveryLinkError(hash: string, searchParams: URLSearchParams): boolean {
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return Boolean(hashParams.get("error") ?? searchParams.get("error"));
}

// A new password must be long enough (mirrors /signup's own
// minLength={6}, Supabase Auth's own default minimum) and must match
// its confirmation — the one piece of validation genuinely local to
// this app rather than already enforced by Supabase Auth itself, so
// it's the one piece worth a real, testable function rather than
// living inline in /reset-password's own submit handler.
export function getPasswordResetValidationError(password: string, confirmPassword: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

// A business summary may honestly have no valueProposition/businessModel
// yet — Business Intelligence's own competitive-positioning/health
// scoring is still architecture-only (lib/business/positioning/
// positioningSynthesis.ts, lib/business/profile/businessHealth.ts), so
// customerProblem/valueProposition are never fabricated to fill this gap.
// Milestone 119 extends this chain (rather than replacing it) to fall
// back to the Decision Platform's own already-real, already-persisted
// keyFindings/investmentThesis before giving up — every completed
// analysis already has at least one real, evidence-backed finding or
// argument, so "No summary available." should now only ever appear for
// a genuinely empty/degenerate profile. Reused identically by the
// Projects list (app/projects/page.tsx), the Idea Comparison view
// (Milestone 49), and the dashboard's Recent Projects panel. Typed
// narrowly to just the fields actually read, rather than importing
// BusinessSummary/Finding/InvestmentThesis from lib/decision — this file
// stays a pure, dependency-free formatting layer, never a consumer of a
// knowledge platform's schema.
export function getBusinessSummaryHeadline(
  businessSummary: { valueProposition?: string; businessModel?: string },
  keyFindings?: { summary: string }[],
  investmentThesis?: { positiveArguments: string[] }
): string {
  return (
    businessSummary.valueProposition ??
    businessSummary.businessModel ??
    keyFindings?.[0]?.summary ??
    investmentThesis?.positiveArguments[0] ??
    "No summary available."
  );
}

export interface ProjectSummaryFields {
  problemLabel: string;
  problemValue: string;
  solutionLabel: string;
  solutionValue: string;
}

// The Projects list card's "Problem"/"Solution" pair (Milestone 119).
// businessSummary.customerProblem/valueProposition are BusinessProfile's
// own real, curated fields — shown as-is, atomically as a pair, whenever
// BOTH are genuinely present (never mixing one real curated field with a
// fallback for the other, which would pair unrelated concepts under the
// same two labels). Today those two fields are always absent (see this
// function's own doc comment above), so the atomic fallback is what
// every completed analysis actually shows: the investment thesis's
// strongest real positive argument, and the single highest-priority
// critical risk — genuinely different content, so it gets a genuinely
// different, honestly-relabeled pair of headers rather than "Problem"/
// "Solution" pointing at data that was never about a problem or a
// solution.
export function getProjectSummaryFields(
  businessSummary: { customerProblem?: string; valueProposition?: string },
  investmentThesis?: { positiveArguments: string[] },
  criticalRisks?: { summary: string }[]
): ProjectSummaryFields {
  if (businessSummary.customerProblem && businessSummary.valueProposition) {
    return {
      problemLabel: "Problem",
      problemValue: businessSummary.customerProblem,
      solutionLabel: "Solution",
      solutionValue: businessSummary.valueProposition,
    };
  }

  return {
    problemLabel: "Strongest case",
    problemValue: investmentThesis?.positiveArguments[0] ?? "Not yet known.",
    solutionLabel: "Biggest risk",
    solutionValue: criticalRisks?.[0]?.summary ?? "Not yet known.",
  };
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
