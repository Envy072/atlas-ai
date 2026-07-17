import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getProjectById } from "@/lib/services/projects";
import { buildInvestmentMemo, buildDecisionArtifacts } from "@/lib/decision";
import { H1 } from "@/components/ui/typography";
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
