import { redirect } from "next/navigation";
import Link from "next/link";
import { FolderKanban, SearchX } from "lucide-react";
import { listProjects } from "@/lib/services/projects";
import { getCurrentUser } from "@/lib/services/auth";
import { formatPercent, getBusinessSummaryHeadline, getProjectSummaryFields } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { H1, Small, Body } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";

// project.score (the old AnalysisResult-shaped field) has no equivalent
// in DecisionProfile — no numeric score is ever fabricated anywhere in
// this codebase (MILESTONE_26_DESIGN.md Section 6). "Confidence" is a
// real, data-quality figure from confidenceSummary, honestly labeled as
// confidence, not a verdict.
//
// Milestone 119 — getProjectSummaryFields() prefers BusinessSummary's
// own real, optional customerProblem/valueProposition when both are
// present, but Business Intelligence's competitive-positioning/health
// scoring is still architecture-only today (see lib/format.ts's own doc
// comment), so this always falls back to the Decision Platform's
// already-real, already-persisted investment-thesis/critical-risk data
// instead of a bare "Not yet known." on every single card.
//
// Already protected by middleware.ts (Milestone 27b) — this check
// (Milestone 27c) supplies the real user id listProjects() now requires
// and scopes every returned project to that user, never assumed
// present just because middleware ran.
interface ProjectsPageProps {
  searchParams: Promise<{ q?: string }>;
}

// `?q=` search (MILESTONE_29_DESIGN.md Deliverable 6), submitted by
// Header's search form. A plain, in-memory, case-insensitive substring
// match over this user's own already-fetched projects — no new query
// shape, no new service function; consistent with the "measure before
// optimizing" rule (CLAUDE.md Section 15), since this list is the same
// small, per-user set listProjects() always returns.
export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { q } = await searchParams;
  const allProjects = await listProjects(user.id);
  const projects = q
    ? allProjects.filter((project) => project.title.toLowerCase().includes(q.toLowerCase()))
    : allProjects;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <H1>Projects</H1>
          {q && (
            <p className="mt-2 text-sm text-muted-foreground">
              Showing results for &ldquo;{q}&rdquo; ·{" "}
              <Link href="/projects" className="font-medium text-primary hover:underline">
                Clear
              </Link>
            </p>
          )}
        </div>

        {allProjects.length >= 2 && (
          <Link href="/projects/compare" className="text-sm font-medium text-primary hover:underline">
            Compare analyses
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={q ? SearchX : FolderKanban}
            title={q ? `No projects match "${q}"` : "No projects yet"}
            description={
              q
                ? "Try a different search term."
                : "Every startup idea you analyze is saved here, most recent first."
            }
            action={
              q ? (
                <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
                  Clear search
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => {
            const { businessSummary, investmentThesis, keyFindings, criticalRisks, confidenceSummary } =
              project.profile;
            const summaryFields = getProjectSummaryFields(businessSummary, investmentThesis, criticalRisks);

            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="block">
                <Card className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-tight text-card-foreground">
                      {project.title}
                    </h2>

                    <Badge variant="secondary">
                      Confidence {formatPercent(Math.round(confidenceSummary.evidenceConfidence))}
                    </Badge>
                  </div>

                  <Body className="mb-6 text-muted-foreground">
                    {getBusinessSummaryHeadline(businessSummary, keyFindings, investmentThesis)}
                  </Body>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Small className="mb-2 block text-muted-foreground">{summaryFields.problemLabel}</Small>
                      <p className="leading-7 text-card-foreground">{summaryFields.problemValue}</p>
                    </div>

                    <div>
                      <Small className="mb-2 block text-muted-foreground">{summaryFields.solutionLabel}</Small>
                      <p className="leading-7 text-card-foreground">{summaryFields.solutionValue}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
