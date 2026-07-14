import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string | null;
}

// The single server-side authentication entry point
// (MILESTONE_27_DESIGN.md Section 3.6). Every future route or Server
// Component that needs to know who's asking calls this — never
// lib/supabase/server.ts, next/headers, or Supabase Auth directly. No
// route or service does that yet (route protection is Milestone 27b),
// but this is the one seam all of that future work will call through.
//
// A deliberate, named exception to "services are framework-agnostic"
// (CLAUDE.md Section 8): this file necessarily touches next/headers
// (via lib/supabase/server.ts), because something server-side has to
// read the request's cookies. No other service does this.
//
// Uses auth.getUser(), never auth.getSession(): getUser() revalidates
// the token against Supabase Auth itself, which is the only call this
// codebase trusts for an identity read that a future authorization
// decision could depend on — getSession() only reads the JWT's own
// claims without revalidating them.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { id: user.id, email: user.email ?? null };
}
