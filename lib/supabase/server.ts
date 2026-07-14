import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side, cookie-aware Supabase client — the one place next/headers
// is touched for auth purposes. Used only by lib/services/auth.ts
// (MILESTONE_27_DESIGN.md Section 3.6) — nothing else should call this
// directly, matching this milestone's "single server-side entry point"
// requirement.
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
