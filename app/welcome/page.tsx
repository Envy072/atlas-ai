import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getUserTier } from "@/lib/services/stripe";
import { ATLAS_AI_PRODUCT_DESCRIPTION } from "@/lib/copy";
import { H1, Body } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// The one-time post-signup welcome step (Milestone 48) — reached via
// app/signup/page.tsx's own redirect fallback. Deliberately not gated
// by any persisted "has completed onboarding" flag (Milestone 48's own
// approved scope excludes onboarding-completion state entirely): this
// page is safe to revisit manually at any time, since it always just
// shows the same real plan and the same two actions, never
// special-cased by visit count or first-time status.
//
// Already protected by middleware.ts's PROTECTED_PATHS — this check is
// not redundant defense-in-depth for its own sake, it's how this page
// gets the real user id getUserTier() requires, matching every other
// protected page's own established pattern (e.g. app/settings/usage/page.tsx).
export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/welcome")}`);
  }

  const tier = await getUserTier(user.id);
  const isFounder = tier === "founder";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <Card className="w-full space-y-8 p-8 text-center">
        <div className="space-y-3">
          <H1>Welcome to Atlas AI</H1>
          <Body className="text-muted-foreground">{ATLAS_AI_PRODUCT_DESCRIPTION}</Body>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Body className="text-muted-foreground">Your plan:</Body>
          <Badge variant={isFounder ? "success" : "outline"}>{isFounder ? "Founder" : "Free"}</Badge>
        </div>

        <div className="flex flex-col gap-3">
          <Button className="w-full gap-2" render={<Link href="/dashboard/analysis" />}>
            <Sparkles className="h-4 w-4" />
            Start your first analysis
          </Button>
          <Button variant="secondary" className="w-full" render={<Link href="/dashboard" />}>
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
