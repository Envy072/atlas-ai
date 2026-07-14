import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — used by /login and /signup
// (MILESTONE_27_DESIGN.md Section 3.8) for their own
// signInWithPassword/signUp calls, and by ProfileMenu
// (MILESTONE_28_DESIGN.md Deliverable 2) for signOut(). Nothing else
// should import this: every actual data read/write still goes through
// this app's own API routes/Server Components.
//
// A separate file from the old lib/supabase.ts anon-key client, which
// is now deprecated and unused: lib/services/projects.ts switched to
// lib/supabase/server.ts's cookie-aware client in Milestone 27c, since
// RLS's auth.uid() only resolves correctly when the query is made by a
// client carrying that request's own session.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
