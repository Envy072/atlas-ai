"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPasswordRecoveryLinkError, getPasswordResetValidationError } from "@/lib/format";
import { trackEvent, identifyUser } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Logo from "@/components/shared/Logo";

// Real reset-password page (Milestone 120) — where /forgot-password's
// emailed link lands. Deliberately NOT added to middleware.ts's
// PROTECTED_PATHS or AUTH_PATHS: clicking a valid recovery link makes
// Supabase's own browser client establish a real, temporary session
// right on this page load (its native recovery flow, not a custom
// token implementation of any kind) — adding this route to AUTH_PATHS
// would make middleware treat that session exactly like any other
// signed-in visit and bounce the user straight to /dashboard before
// they ever see the form, breaking recovery entirely. This route stays
// completely public in middleware, the same way /dashboard/analysis
// and other intentionally-public routes already do.
//
// useSearchParams() requires a Suspense boundary in the App Router —
// ResetPasswordForm is split out for the same reason /login's own
// LoginForm is.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

type Status = "checking" | "invalid" | "ready" | "success";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  // A failed link (expired, already used, malformed) is flagged by
  // Supabase itself in the redirect's own query string (PKCE flow) or
  // hash fragment (implicit flow). Only the query-string half is safe
  // to check in this lazy initializer: a URL's own fragment is never
  // sent to the server at all (fundamental browser behavior, not a
  // Next.js detail), so `useSearchParams()` is the one signal this
  // component can read identically during the server render and the
  // client's first render — checking it here, with hash always empty,
  // is what keeps that first render consistent (no hydration
  // mismatch). The hash-fragment half is handled in the effect below,
  // since a client-only value can only ever be known after mount.
  const [status, setStatus] = useState<Status>(() =>
    isPasswordRecoveryLinkError("", searchParams) ? "invalid" : "checking"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Already resolved by the lazy initializer above — nothing left to
    // check.
    if (status !== "checking") return;

    // The hash-fragment case can only be known client-side, after
    // mount — deferred to a microtask (rather than called synchronously
    // as this effect's own first statement) so this genuinely-necessary
    // client-only check never reads as an avoidable, eager setState
    // call in the effect body itself.
    queueMicrotask(() => {
      if (isPasswordRecoveryLinkError(window.location.hash, new URLSearchParams())) {
        setStatus((current) => (current === "checking" ? "invalid" : current));
      }
    });

    // PASSWORD_RECOVERY is the SDK's own signal that a valid recovery
    // link just established this session — the native Supabase
    // recovery flow this milestone requires, never a hand-parsed token.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    // Covers the case where the recovery session was already
    // established (by detectSessionInUrl) before this effect's own
    // onAuthStateChange listener attached — without this, a session
    // that resolved just slightly too early would leave the page stuck
    // on "checking" forever.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus((current) => (current === "checking" ? "ready" : current));
      }
    });

    // A visit with no recovery link at all (e.g. someone bookmarked or
    // guessed this URL) never fires PASSWORD_RECOVERY and never has a
    // session — this is what stops the page from checking forever in
    // that case.
    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 4000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [status, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = getPasswordResetValidationError(password, confirmPassword);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setLoading(true);
    setFormError(null);

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setFormError(error.message);
      return;
    }

    trackEvent(ANALYTICS_EVENTS.PASSWORD_RESET_COMPLETED);
    if (data.user) identifyUser(data.user.id);

    // Signs out the one-time recovery session deliberately, rather than
    // leaving it active: the person who clicked the link only proved
    // access to the inbox, not (yet) the new password itself — asking
    // for an explicit sign-in with it next is the same trust bar every
    // other session on this app already requires.
    await supabase.auth.signOut();
    setLoading(false);
    setStatus("success");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center p-6">
      <Card className="w-full space-y-6 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <h1 className="text-2xl font-bold text-card-foreground">Reset your password</h1>
        </div>

        {status === "checking" && <p className="text-center text-sm text-muted-foreground">Verifying your link...</p>}

        {status === "invalid" && (
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertDescription>
                This password reset link is invalid or has expired. Request a new one to continue.
              </AlertDescription>
            </Alert>
            <Button className="w-full" render={<Link href="/forgot-password" />}>
              Request a new link
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <Alert variant="success">
              <AlertDescription>Your password has been updated. Sign in with your new password.</AlertDescription>
            </Alert>
            <Button className="w-full" render={<Link href="/login?resetSuccess=1" />}>
              Go to log in
            </Button>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
