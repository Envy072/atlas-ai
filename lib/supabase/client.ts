import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — used only by the temporary /login and
// /signup pages (MILESTONE_27_DESIGN.md Section 3.8) for their own
// signInWithPassword/signUp/signOut calls. Nothing else should import
// this: every actual data read/write still goes through this app's own
// API routes/Server Components, exactly as before this milestone.
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
