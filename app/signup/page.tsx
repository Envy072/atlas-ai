"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// TEMPORARY development/testing page (MILESTONE_27_DESIGN.md /
// Milestone 27a scope) — not final product UI. Exists only to exercise
// sign-up end to end while Supabase Auth is wired up. No route is
// protected yet (Milestone 27b), so nothing links here from the real
// product surface today.
export default function SignupPage() {
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
    // only when confirmation isn't required.
    setMessage(
      data.session
        ? "Account created — you're signed in."
        : "Account created — check your email to confirm before signing in."
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full space-y-6 p-8">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Temporary test page — Milestone 27a
          </p>
          <h1 className="mt-1 text-2xl font-bold text-card-foreground">Sign up</h1>
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
