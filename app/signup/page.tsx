"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectPath } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";

// Real sign-up page (MILESTONE_28_DESIGN.md Deliverable 7) — no longer
// a temporary test page. middleware.ts already redirects an
// already-authenticated visitor away from this route before it ever
// renders (Deliverable 8b).
//
// useSearchParams() requires a Suspense boundary in the App Router —
// SignupForm is split out for the same reason as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Whether this account can sign in immediately or needs email
    // confirmation first depends on the Supabase project's own Auth
    // settings (outside this codebase's control) — session is non-null
    // only when confirmation isn't required. Only navigate away in
    // that case; otherwise the "check your email" message is the only
    // thing to show, unchanged from before this milestone.
    //
    // Fallback destination is /welcome, not /dashboard (Milestone 48) —
    // a brand-new signup's default landing spot; an explicit, valid
    // redirectTo (e.g. bounced here from a specific protected page) is
    // still honored exactly as before, unchanged.
    if (data.session) {
      router.push(getSafeRedirectPath(searchParams.get("redirectTo"), "/welcome"));
      return;
    }

    setMessage("Account created — check your email to confirm before signing in.");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full space-y-6 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <h1 className="text-2xl font-bold text-card-foreground">Sign up</h1>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
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
            minLength={6}
            autoComplete="new-password"
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert variant="success">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
