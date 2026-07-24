import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getProjectById } from "@/lib/services/projects";
import { getUserTier } from "@/lib/services/stripe";
import { buildDueDiligenceReport } from "@/lib/decision";
import { H1, H2, Body } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DueDiligenceReportView from "@/components/workspace/decision-report/DueDiligenceReportView";

interface DueDiligenceReportPageProps {
  params: Promise<{ id: string }>;
}

// Reaches buildDueDiligenceReport() for the first time anywhere in this
// codebase (MILESTONE_31_DESIGN.md Sub-milestone 31.3) — the exact
// ownership pattern app/projects/[id]/page.tsx already uses, reused
// unmodified.
//
// As of Milestone 44, the Due Diligence Report is a Founder-only
// artifact (MILESTONE_44_DESIGN.md Scope) — gated after the existing
// ownership check, mirroring memo/page.tsx's own identical addition
// exactly.
export default async function DueDiligenceReportPage({ params }: DueDiligenceReportPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${id}/diligence`)}`);
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
          <H2 className="text-2xl">Due Diligence Report is a Founder feature</H2>
          <Body className="mt-3 text-gray-600">
            Upgrade to the Founder tier to unlock the full artifact suite, including the Due Diligence Report.
          </Body>
          <Button className="mt-6" render={<Link href="/pricing" />}>
            View pricing
          </Button>
        </Card>
      </div>
    );
  }

  const report = buildDueDiligenceReport(project.profile);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <H1 className="mb-8">Due Diligence Report</H1>

      <DueDiligenceReportView report={report} />
    </div>
  );
}
