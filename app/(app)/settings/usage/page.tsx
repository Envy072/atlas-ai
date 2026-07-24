import { redirect } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getUserTier, FREE_TIER_MONTHLY_ANALYSIS_LIMIT } from "@/lib/services/stripe";
import { countProjectsThisMonth } from "@/lib/services/projects";
import { H1, H3, Small } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SettingsNav from "@/components/settings/SettingsNav";

interface AccessRow {
  label: string;
  included: boolean;
}

// This month's real analysis count is the only genuinely metered,
// trackable number in this app today (Milestone 44's
// countProjectsThisMonth). Memo/Diligence Report access and Competitor
// Reports are shown as a real access capability (Included / Founder
// Only), never as an invented "X used" count — this app has no
// per-artifact view-tracking table, and fabricating one here would be
// exactly the kind of statistic this product's own "never invent a
// number" principle exists to prevent (MILESTONE_45_DESIGN.md Part 5's
// approved deviation). Competitor Reports is marked Included for every
// tier, honestly, because nothing in the real code gates it today — a
// pre-existing, unrelated gap (CLAUDE.md's own roadmap notes), not a
// restriction this page should imply exists.
export default async function UsagePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/settings/usage")}`);
  }

  // Independent reads, keyed only on user.id — run in parallel rather
  // than as a sequential waterfall.
  const [tier, analysesThisMonth] = await Promise.all([
    getUserTier(user.id),
    countProjectsThisMonth(user.id, new Date()),
  ]);
  const isFounder = tier === "founder";

  const accessRows: AccessRow[] = [
    { label: "Investment Memo", included: isFounder },
    { label: "Due Diligence Report", included: isFounder },
    { label: "Competitor Reports", included: true },
  ];

  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-2">Settings</H1>
      <SettingsNav active="usage" />

      <Card className="p-8">
        <H3 className="mb-1">This Month</H3>
        <Small className="mb-6 block text-muted-foreground">
          {isFounder ? "Founder tier — no limits on analyses." : "Free tier — resets at the start of each month."}
        </Small>

        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-foreground">
            {isFounder ? "Unlimited" : `${analysesThisMonth} / ${FREE_TIER_MONTHLY_ANALYSIS_LIMIT}`}
          </p>
          <Small className="text-muted-foreground">analyses used</Small>
        </div>
      </Card>

      <Card className="mt-6 p-8">
        <H3 className="mb-4">Artifact Access</H3>
        <ul className="space-y-3">
          {accessRows.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4">
              <Small className="text-foreground">{row.label}</Small>
              {row.included ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Included
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Founder Only
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
