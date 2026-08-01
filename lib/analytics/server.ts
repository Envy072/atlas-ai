import { PostHog } from "posthog-node";
import type { AnalyticsEvent, AnalyticsProperties } from "@/lib/analytics/events";

// Milestone 123 — Product Analytics, server side. Same key,
// NEXT_PUBLIC_POSTHOG_KEY, read on both sides (lib/analytics/client.ts's
// own comment): a PostHog project API key is write-only for ingestion
// and grants no dashboard read access, the same safe-to-expose
// reasoning this codebase already applies to the Sentry DSN and the
// Supabase anon key (CLAUDE.md Section 16) — one env var, not two.
//
// A module-level singleton, lazily constructed on first use and cached
// as `null` (not re-checked) once no key is found, mirroring the
// existing `let client: SupabaseClient | undefined` singleton pattern
// already used elsewhere in this codebase for a similar "construct once,
// reuse across invocations" need.
let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  client = apiKey
    ? new PostHog(apiKey, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com" })
    : null;

  return client;
}

// The one, shared way any server-side code sends a product event —
// never posthog-node's own capture() called directly at a call site.
// No key configured → a real, harmless no-op, never a thrown error
// (this app's own DSN-optional standard, Milestone 121).
//
// Always flushes immediately after capturing rather than relying on
// posthog-node's own background batching interval: this app's actual
// hosting platform is unconfirmed (Milestone 121/122's own finding —
// no vercel.json, no platform-specific config anywhere), and a
// serverless invocation can freeze or terminate before a deferred batch
// ever sends. flush() only forces delivery of what's already queued —
// it never closes the underlying client, so the same singleton stays
// safe to reuse on the next call.
//
// `uuid`, when given, is PostHog's own native event-deduplication key
// (posthog-node's EventMessage.uuid) — used by callers whose own
// trigger can genuinely fire more than once for the same real-world
// event (e.g. Stripe's at-least-once webhook delivery guarantee), so a
// redelivery is recorded once, not twice.
export async function trackServerEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: AnalyticsProperties,
  uuid?: string
): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;

  posthog.capture({ distinctId, event, properties, uuid });
  await posthog.flush();
}
