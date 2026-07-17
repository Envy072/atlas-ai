import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// The service-role, RLS-bypassing Supabase client (MILESTONE_44_DESIGN.md
// Self-Review). This is NOT a general-purpose database client and must
// never be imported anywhere outside lib/services/stripe.ts. Every RLS
// policy in this database exists specifically to stop an
// authenticated/anon caller from reading or writing another user's
// data — a client built with the service-role key bypasses all of that
// by design, so any other caller reaching for this file would silently
// defeat every RLS policy in this project, not just the one it meant to
// touch.
//
// The one legitimate reason it exists at all: Stripe's webhook has no
// user session (no cookies, no JWT) to carry through
// lib/supabase/server.ts's cookie-aware client, yet it must still write
// to public.subscriptions on an arbitrary user's behalf once their
// payment is confirmed — a trusted, Stripe-signature-verified server
// process, not a user action, so bypassing RLS here is the correct
// choice, not a shortcut around it.
export function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
