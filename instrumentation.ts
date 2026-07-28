import * as Sentry from "@sentry/nextjs";

// Milestone 121 — production error monitoring, closing the Founder
// Acceptance Review's highest operational gap (no error tracking
// existed anywhere; only ad hoc console.error). DSN-optional by
// design: Sentry.init() with an undefined `dsn` is the SDK's own
// documented no-op — every Sentry.captureException()/
// captureRequestError() call elsewhere in the app becomes a harmless
// no-op too, so this ships safely with no real Sentry project yet.
// Setting NEXT_PUBLIC_SENTRY_DSN in the environment activates
// monitoring with zero further code changes.
//
// Next.js's own native, stable (v15+) server instrumentation
// convention — register() runs once per server instance, in whichever
// runtime (Node or Edge) that instance is. @sentry/nextjs resolves to
// the correct runtime-specific build automatically via its own
// package exports, so one unconditional init() call is correct for
// both.
export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}

// Next.js's own native onRequestError hook (stable since v15.0.0) —
// fires for an error Next.js itself catches escaping Server Component
// rendering or the proxy/middleware layer, with zero try/catch added
// to either. Deliberately NOT relied on for API route handlers: every
// route in this codebase already catches its own errors internally
// (see lib/api/response.ts's jsonError()), so a route's own throw
// never escapes far enough for Next.js's outer boundary to see it —
// that path is captured explicitly inside jsonError() instead, not
// duplicated here.
export const onRequestError = Sentry.captureRequestError;
