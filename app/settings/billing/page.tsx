import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getSubscriptionDetails } from "@/lib/services/stripe";
import { formatDate } from "@/lib/format";
import { H1 } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import StatCell from "@/components/shared/StatCell";
import EmptyState from "@/components/shared/EmptyState";
import SettingsNav from "@/components/settings/SettingsNav";

const STATUS_TONE: Record<"active" | "canceled" | "past_due", { label: string; tone: "success" | "neutral" | "warning" }> = {
  active: { label: "Active", tone: "success" },
  canceled: { label: "Canceled", tone: "neutral" },
  past_due: { label: "Past due", tone: "warning" },
};

// The Billing page (Milestone 45, Part 4) — real subscription data
// only, no fabricated fields. Renewal date is fetched live from Stripe
// inside getSubscriptionDetails() rather than stored in Supabase, so
// this page can never show a stale copy of what Stripe itself already
// knows (MILESTONE_45_DESIGN.md's "no schema change" resolution).
export default async function BillingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/settings/billing")}`);
  }

  const subscription = await getSubscriptionDetails(user.id);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-2">Settings</H1>
      <SettingsNav active="billing" />

      {subscription ? (
        <Card className="p-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <StatCell label="Current Plan" value={subscription.tier === "founder" ? "Founder" : "Free"} />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</p>
              <div className="mt-2">
                <StatusPill
                  label={STATUS_TONE[subscription.status].label}
                  tone={STATUS_TONE[subscription.status].tone}
                />
              </div>
            </div>
            <StatCell
              label="Renewal Date"
              value={subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "Unavailable"}
            />
            <StatCell label="Subscription ID" value={subscription.stripeSubscriptionId} />
            <StatCell label="Stripe Customer ID" value={subscription.stripeCustomerId} className="sm:col-span-2" />
          </div>

          <Button className="mt-8" render={<Link href="/api/billing/portal" />}>
            Manage Billing
          </Button>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="You're on the Free plan"
            description="There's no billing account to manage yet — upgrade to Founder to unlock unlimited analyses and the full artifact suite."
            action={<Button render={<Link href="/pricing" />}>View pricing</Button>}
          />
        </Card>
      )}
    </div>
  );
}
