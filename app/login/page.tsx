"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectPath } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";

// Real sign-in page (MILESTONE_28_DESIGN.md Deliverable 6) — no longer
// a temporary test page. middleware.ts already redirects an
// already-authenticated visitor away from this route before it ever
// renders (Deliverable 8b); the "already signed in" branch below is a
// client-side safety net for the one case that survives that (e.g.
// signing in from a second tab while this one is still open), not the
// primary path.
//
// useSearchParams() requires a Suspense boundary in the App Router —
// LoginForm is split out so that requirement doesn't force this whole
// page into an unnecessarily different rendering mode.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingSession(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // getSafeRedirectPath rejects anything that isn't a genuine,
    // same-origin relative path — an absolute or protocol-relative
    // redirectTo falls back to /dashboard instead (MILESTONE_28_DESIGN.md
    // Section 9).
    router.push(getSafeRedirectPath(searchParams.get("redirectTo"), "/dashboard"));
  }

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    router.refresh();
  }

  if (checkingSession) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full space-y-6 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <h1 className="text-2xl font-bold text-card-foreground">Log in</h1>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-card-foreground">{user.email}</span>
            </p>
            <Button onClick={handleSignOut} disabled={loading} className="w-full">
              {loading ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
