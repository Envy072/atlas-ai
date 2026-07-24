import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getProjectById } from "@/lib/services/projects";
import { getUserTier } from "@/lib/services/stripe";
import { buildInvestmentMemo, buildDecisionArtifacts } from "@/lib/decision";
import { H1, H2, Body } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import InvestmentMemoView from "@/components/workspace/decision-report/InvestmentMemoView";

interface InvestmentMemoPageProps {
  params: Promise<{ id: string }>;
}

// Reaches buildInvestmentMemo() for the first time anywhere in this
// codebase (MILESTONE_31_DESIGN.md Sub-milestone 31.2) — the exact
// ownership pattern app/projects/[id]/page.tsx already uses, reused
// unmodified. As of Milestone 38, this route calls
// buildDecisionArtifacts(project.profile) — the one shared computation
// point for Decision Intelligence's recommendations and verdict
// (lib/decision/artifacts/decisionArtifacts.ts) — and passes both real
// results into buildInvestmentMemo(), replacing the honest, but now
// outdated, "nothing generates one yet" empty state this route relied
// on before deriveRecommendations()/deriveVerdict() existed.
//
// As of Milestone 44, the Investment Memo is a Founder-only artifact
// (MILESTONE_44_DESIGN.md Scope) — gated after the existing ownership
// check, not instead of it: a non-owner still gets notFound(), never a
// hint that a project exists at all; only a real, verified owner on the
// Free tier sees the upgrade prompt below.
export default async function InvestmentMemoPage({ params }: InvestmentMemoPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${id}/memo`)}`);
  }

  const project = await getProjectById(id, user.id);

  if (!project) {
    notFound();
  }

  const tier = await getUserTier(user.id);

  if (tier !== "founder") {
    return (
      <div className="mx-auto max-w-5xl p-8">
        <Link
          href={`/projects/${id}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to project
        </Link>

        <Card className="p-8 text-center">
          <H2 className="text-2xl">Investment Memo is a Founder feature</H2>
          <Body className="mt-3 text-gray-600">
            Upgrade to the Founder tier to unlock the full artifact suite, including the Investment Memo.
          </Body>
          <Button className="mt-6" render={<Link href="/pricing" />}>
            View pricing
          </Button>
        </Card>
      </div>
    );
  }

  const { recommendations, verdict } = await buildDecisionArtifacts(project.profile);
  const memo = buildInvestmentMemo(project.profile, recommendations, verdict);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <H1 className="mb-8">Investment Memo</H1>

      <InvestmentMemoView memo={memo} />
    </div>
  );
}
