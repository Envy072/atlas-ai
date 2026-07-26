"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";

// Real forgot-password page (Milestone 120) — closes Private Beta
// Readiness Review High Finding H2 ("no self-service account
// recovery"). Deliberately NOT added to middleware.ts's AUTH_PATHS: an
// already-authenticated visitor landing here by mistake is harmless
// (unlike /login/ /signup, there's no conflicting purpose to redirect
// away from), and keeping this route untouched in middleware avoids
// any risk of it interfering with the one route that actually matters
// here — /reset-password, which must never be gated (see that page's
// own comment).
export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // resetPasswordForEmail() deliberately never reveals whether the
    // given address belongs to a real account (Supabase Auth's own
    // documented enumeration-resistant behavior) — matching this
    // codebase's existing "never let a caller distinguish 'not found'
    // from 'not yours'" convention (lib/services/projects.ts's
    // getProjectById, MILESTONE_29_DESIGN.md Section 9). An `error`
    // here means a genuine technical failure (malformed address,
    // rate-limited, network), never "no such account" — so the success
    // state below is shown identically for a known and an unknown
    // email, on purpose.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full space-y-6 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <h1 className="text-2xl font-bold text-card-foreground">Reset your password</h1>
        </div>

        {submitted ? (
          <Alert variant="success">
            <AlertDescription>
              If an account exists for that email, we&rsquo;ve sent a link to reset your password. Check your inbox.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
