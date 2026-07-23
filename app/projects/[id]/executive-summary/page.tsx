import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getProjectById } from "@/lib/services/projects";
import { buildExecutiveSummary } from "@/lib/decision";
import { H1 } from "@/components/ui/typography";
import ExecutiveSummaryView from "@/components/workspace/decision-report/ExecutiveSummaryView";

interface ExecutiveSummaryPageProps {
  params: Promise<{ id: string }>;
}

// Reaches buildExecutiveSummary() for the first time anywhere in this
// codebase (MILESTONE_31_DESIGN.md Sub-milestone 31.1) — the exact
// ownership pattern app/projects/[id]/page.tsx already uses
// (getCurrentUser + redirect, getProjectById + notFound), reused
// unmodified. buildExecutiveSummary is called directly, not through a
// service: it is pure, synchronous, and zero-I/O, exactly like the
// formatters this codebase already calls straight from a Server
// Component (MILESTONE_31_DESIGN.md Section 7).
export default async function ExecutiveSummaryPage({ params }: ExecutiveSummaryPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${id}/executive-summary`)}`);
  }

  const project = await getProjectById(id, user.id);

  if (!project) {
    notFound();
  }

  const summary = buildExecutiveSummary(project.profile);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      <H1 className="mb-8">Executive Summary</H1>

      <ExecutiveSummaryView summary={summary} />
    </div>
  );
}
