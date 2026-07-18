import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side, cookie-aware Supabase client — the one place next/headers
// is touched for auth purposes. Originally scoped to lib/services/auth.ts
// alone (MILESTONE_27_DESIGN.md Section 3.6); lib/services/stripe.ts and,
// as of Milestone 47, lib/services/rateLimit/ are both legitimate
// server-side callers with a real per-request need — this comment is
// corrected to name them rather than leave a stale, narrower claim. What
// still never calls this directly: any route/component (they go through
// the service layer), and anything needing to bypass RLS entirely (that
// remains lib/supabase/admin.ts's own, separate, narrower purpose).
//
// setAll can throw when called from a Server Component (Next.js only
// allows mutating cookies from a Server Action or Route Handler) — a
// documented, harmless case, not a bug: middleware.ts is the thing
// actually responsible for persisting a refreshed session cookie.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore (see above).
          }
        },
      },
    }
  );
}
