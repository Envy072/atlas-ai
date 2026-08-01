"use client";

import posthog from "posthog-js";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics/events";

// Milestone 123 — Product Analytics, client side. Deliberately guards
// initialization itself (an explicit `initialized` flag checked before
// every call) rather than trusting posthog-js's own undocumented
// behavior for an absent key — the same DSN-optional standard
// Milestone 121 set for Sentry, but verified here via our own explicit
// guard clause instead of the vendor SDK's internal handling of
// `undefined`, since posthog-js's own source for that case isn't
// documented the way Sentry's is. No key configured → every function
// below is a real, harmless no-op, never a thrown error.
let initialized = false;

// Called once from instrumentation-client.ts, alongside Sentry's own
// init() call in that same file — Next.js's own native convention for
// "monitoring, analytics code... that runs before your app becomes
// interactive" (its own doc's wording), so both concerns live in one
// place rather than two competing initialization patterns.
export function initAnalytics(): void {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || initialized) return;

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // This is explicitly NOT a tracking-everything setup (Milestone
    // 123's own objective) — every one of these defaults would
    // otherwise auto-capture pageviews, every click, and page-leave
    // events with zero curation. Every event this app actually sends
    // goes through trackEvent() below, from a hand-picked call site,
    // never from autocapture.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
  });
  initialized = true;
}

// The one, shared way any client component sends a product event —
// never posthog.capture() called directly at a call site, so every
// event name and property shape is guaranteed to come from
// lib/analytics/events.ts's own closed taxonomy.
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// Links a newly-authenticated user's prior anonymous activity (e.g. an
// anonymous analysis run before signup — Milestone 27's own approved
// anonymous-analysis product decision) to their real identity, using
// only the Supabase user id, never an email or any other PII, as the
// distinct_id.
export function identifyUser(userId: string): void {
  if (!initialized) return;
  posthog.identify(userId);
}
