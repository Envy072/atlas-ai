import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The service-role, RLS-bypassing Supabase client (MILESTONE_44_DESIGN.md
// Self-Review). This is NOT a general-purpose database client. Every RLS
// policy in this database exists specifically to stop an
// authenticated/anon caller from reading or writing another user's
// data — a client built with the service-role key bypasses all of that
// by design, so any other caller reaching for this file would silently
// defeat every RLS policy in this project, not just the one it meant to
// touch. Two legitimate callers exist today — each added deliberately,
// with the same justification, not by widening this comment casually:
//
// 1. lib/services/stripe.ts — Stripe's webhook has no user session (no
//    cookies, no JWT) to carry through lib/supabase/server.ts's
//    cookie-aware client, yet it must still write to public.subscriptions
//    on an arbitrary user's behalf once their payment is confirmed — a
//    trusted, Stripe-signature-verified server process, not a user
//    action, so bypassing RLS here is the correct choice, not a shortcut
//    around it.
//
// 2. lib/analysis-session/storage/supabaseStore.ts (Milestone 106,
//    Milestone 104A ADR Decision 4) — analysis_sessions is read/written
//    by both anonymous and signed-in callers (Milestone 27's approved
//    anonymous-analysis decision); an anonymous caller has no auth.uid()
//    for a `to authenticated` RLS policy to check against. The real
//    access control is the session id's own unguessability (Milestone
//    47's randomUUID()) plus sessionLifecycle.ts's own application-layer
//    ownerId check — never a Postgres user context. analysis_sessions'
//    own migration enables RLS with zero policies for any role
//    specifically so this is the only path in, mirroring reason #1's
//    same shape: a trusted server process, no user session to carry,
//    application code is the true enforcement point.
//
// No other caller may reach for this file without the same rigor: name
// the specific reason no user-session-bound client can do the job, not
// "it's easier."
export function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
