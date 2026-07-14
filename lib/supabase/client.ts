import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — used only by the temporary /login and
// /signup pages (MILESTONE_27_DESIGN.md Section 3.8) for their own
// signInWithPassword/signUp/signOut calls. Nothing else should import
// this: every actual data read/write still goes through this app's own
// API routes/Server Components, exactly as before this milestone.
//
// This is deliberately a separate file from lib/supabase.ts (the
// existing, unmodified anon-key client lib/services/projects.ts uses)
// rather than a replacement of it — that file has no session/cookie
// dependency at all today, so there's nothing to migrate yet. The two
// are expected to consolidate once ownership/RLS work (a future
// milestone) needs table queries to become session-aware too.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
