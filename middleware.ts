import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Exact-match only, deliberately not prefix matching: /dashboard must
// NOT also match /dashboard/analysis, which stays public per the
// approved anonymous-analysis product decision (MILESTONE_27_DESIGN.md
// Section 3.11; re-confirmed and scoped precisely at Milestone 27b).
// /research, /reports, /competitors, /templates are deliberately absent
// — left untouched per that same milestone's Finding 2, not an
// oversight.
const PROTECTED_PATHS = new Set(["/dashboard", "/projects", "/settings"]);

// The symmetric case (MILESTONE_28_DESIGN.md Deliverable 8b): an
// already-authenticated visitor gets no reason to see the sign-in/
// sign-up forms at all.
const AUTH_PATHS = new Set(["/login", "/signup"]);

// Session refresh (MILESTONE_27_DESIGN.md Section 3.5, unchanged since
// Milestone 27a) plus page-route redirects (Milestone 27b) — the two
// responsibilities this file was always designed to own. Still the
// only place a redirect decision is made; no API route is gated here
// or anywhere else in this milestone (POST /api/analysis-sessions and
// its siblings stay fully public, per the same product decision).
//
// Deliberately does NOT call lib/services/auth.ts's getCurrentUser():
// that function depends on next/headers' cookies(), which isn't
// available inside middleware's own runtime (a distinct cookie API —
// request.cookies/response.cookies — is required here instead, the
// same constraint already true of this file since Milestone 27a). This
// is the one, already-accepted exception to "getCurrentUser() is the
// sole server-side authentication entry point" — every Server
// Component/Route Handler elsewhere still must call it, never Supabase
// Auth directly.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Triggers a refresh if the access token is near/past expiry; the
  // refreshed cookie is written via setAll above. Also doubles as this
  // milestone's authorization read: no second call is made.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && PROTECTED_PATHS.has(request.nextUrl.pathname)) {
    const loginUrl = new URL("/login", request.url);
    // Safe to attach unvalidated: this value is constructed here from
    // Next's own request.nextUrl.pathname, never from caller-controlled
    // input — the untrusted side of this mechanism is /login and
    // /signup reading it back out of the query string, which is why
    // the validation (lib/format.ts's getSafeRedirectPath) lives there,
    // not here (MILESTONE_28_DESIGN.md Deliverable 8a).
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && AUTH_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
