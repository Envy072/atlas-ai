// Milestone 123 — Product Analytics. The complete, closed event
// taxonomy: every event this app is allowed to send lives here, by
// name, as the single source of truth — a call site imports one of
// these constants, never a raw string, so a typo'd event name is a
// compile error, not a silently-missing dashboard metric.
//
// Deliberately scoped to the Founder Acceptance Review's own privacy
// line: no startup idea text, no report contents, no OpenAI prompts,
// no free-form user text, ever, in an event name or property value.
// Every property allowed by AnalyticsProperties below is a structural
// fact (an id, a count, a boolean, an enum-like string) — never prose a
// founder typed.
export const ANALYTICS_EVENTS = {
  // Authentication
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_COMPLETED: "login_completed",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",
  PASSWORD_RESET_COMPLETED: "password_reset_completed",

  // Analysis
  ANALYSIS_STARTED: "analysis_started",
  ANALYSIS_COMPLETED: "analysis_completed",
  ANALYSIS_FAILED: "analysis_failed",
  ANALYSIS_CANCELLED: "analysis_cancelled",

  // Projects
  PROJECT_OPENED: "project_opened",
  // No delete-project feature exists anywhere in this app today
  // (verified during this milestone's own Phase 1 — confirmed via a
  // repo-wide search for any delete-project route/handler/button).
  // This event name is reserved and schema-complete, matching this
  // codebase's own established pattern of an honest, forward-compatible
  // shape (e.g. BusinessSummary's own architecture-only fields) — it
  // simply has no real call site yet, and will never fire until that
  // feature is actually built. Not fabricated UI to give it one.
  PROJECT_DELETED: "project_deleted",

  // Reports
  EXECUTIVE_SUMMARY_VIEWED: "executive_summary_viewed",
  INVESTMENT_MEMO_VIEWED: "investment_memo_viewed",
  DUE_DILIGENCE_VIEWED: "due_diligence_viewed",

  // Billing
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  // Milestone: Stripe Webhooks. Distinct from CHECKOUT_COMPLETED (a
  // funnel event — "the founder finished the Payment Link flow") —
  // these four track the subscription's own lifecycle as Stripe's
  // webhooks report it, one per handled event type in
  // lib/services/stripe.ts, so product/ops can see renewals, plan
  // changes, cancellations, and payment failures as they happen, not
  // just the initial purchase.
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_UPDATED: "subscription_updated",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  SUBSCRIPTION_PAYMENT_FAILED: "subscription_payment_failed",

  // Errors — deliberately separate from Milestone 121's Sentry capture:
  // same two moments (jsonError()'s unexpected-error branch, the three
  // error boundaries), but a different audience (product/ops visibility
  // into how often founders hit a broken state, not a debuggable stack
  // trace).
  UNEXPECTED_CLIENT_ERROR: "unexpected_client_error",
  UNEXPECTED_SERVER_ERROR: "unexpected_server_error",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// A plain Record of primitives, never `unknown` or `Record<string,
// any>` — a call site physically cannot pass through a whole error
// message, an idea string, or any other free-form value typed as
// `string` without it looking exactly like every other safe property,
// which is precisely why this stays intentionally narrow.
export type AnalyticsProperties = Record<string, string | number | boolean>;
