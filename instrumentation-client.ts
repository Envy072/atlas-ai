import * as Sentry from "@sentry/nextjs";

// Milestone 121 — the browser counterpart to instrumentation.ts's
// register(). Next.js's own native client instrumentation convention
// (stable since v15.3, replacing the older sentry.client.config.ts
// pattern): runs once, after the document loads but before React
// hydration begins. This single init() call is what gives this
// codebase global client-exception coverage — Sentry's browser SDK
// automatically instruments window.onerror/onunhandledrejection from
// here, so no component or event handler needs wrapping by hand.
// DSN-optional: see instrumentation.ts's own comment — a missing
// NEXT_PUBLIC_SENTRY_DSN makes this a documented no-op, never a
// runtime failure.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
