import Link from "next/link";
import { Sparkles, FolderKanban, CreditCard } from "lucide-react";
import type { SubscriptionTier } from "@/lib/schemas/subscription";
import { FREE_TIER_MONTHLY_ANALYSIS_LIMIT } from "@/lib/services/stripe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { H3, Small } from "@/components/ui/typography";

interface DashboardAccountSummaryProps {
  tier: SubscriptionTier;
  analysesThisMonth: number;
}

// Quick Actions here are deliberately only the three that correspond to
// a real, standalone product action (Milestone 45, Part 6's approved
// deviation) — "Create Memo"/"Create Due Diligence" were dropped: both
// are per-project artifacts reached from inside an already-completed
// analysis, not something a founder can start from a blank dashboard.
export default function DashboardAccountSummary({ tier, analysesThisMonth }: DashboardAccountSummaryProps) {
  const isFounder = tier === "founder";

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <H3 className="text-lg">{isFounder ? "Founder" : "Free"} plan</H3>
            <Badge variant={isFounder ? "success" : "outline"}>{isFounder ? "Unlimited" : "Free tier"}</Badge>
          </div>
          <Small className="mt-1 block text-muted-foreground">
            {isFounder
              ? "Unlimited analyses this month."
              : `${analysesThisMonth} / ${FREE_TIER_MONTHLY_ANALYSIS_LIMIT} analyses used this month.`}
          </Small>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" render={<Link href="/dashboard/analysis" />}>
            <Sparkles className="h-3.5 w-3.5" />
            New Analysis
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" render={<Link href="/projects" />}>
            <FolderKanban className="h-3.5 w-3.5" />
            View Projects
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" render={<Link href="/settings/billing" />}>
            <CreditCard className="h-3.5 w-3.5" />
            Billing
          </Button>
        </div>
      </div>
    </Card>
  );
}
