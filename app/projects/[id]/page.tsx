import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getProjectById } from "@/lib/services/projects";
import { buildDecisionArtifacts, isDecisionStale } from "@/lib/decision";
import { formatRelativeTime } from "@/lib/format";
import { H1, Small } from "@/components/ui/typography";
import DecisionReport from "@/components/workspace/decision-report/DecisionReport";
import DecisionArtifactLinks from "@/components/workspace/decision-report/DecisionArtifactLinks";
import FlagAnalysisDialog from "@/components/workspace/decision-report/FlagAnalysisDialog";
import StaleAnalysisBadge from "@/components/workspace/decision-report/StaleAnalysisBadge";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

// Ownership-enforced project detail route (MILESTONE_29_DESIGN.md
// Deliverable 3). Not covered by middleware.ts's PROTECTED_PATHS (an
// exact-match set, deliberately not prefix-matched) — this page's own
// getCurrentUser() check is the sole authentication gate here, the same
// pattern app/dashboard/analysis/page.tsx already relies on for the
// same reason.
//
// Reuses DecisionReport: a Project's profile/verification fields are
// exactly the already-validated shapes that component was built to
// render for the live analysis flow. As of Milestone 38, this route
// also calls buildDecisionArtifacts(project.profile) — the one shared
// computation point for Decision Intelligence's recommendations and
// verdict (lib/decision/artifacts/decisionArtifacts.ts) — and passes
// the resulting verdict through to DecisionReport/DecisionSummaryPanel.
//
// getProjectById treats "doesn't exist," "malformed," and "belongs to
// someone else" identically (a null return) — notFound() fires for all
// three alike, so a guessed id never reveals which case it was
// (MILESTONE_29_DESIGN.md Section 9, "Enumeration resistance").
//
// As of Milestone 39, this route also renders FlagAnalysisDialog — a
// self-contained Client Component with its own independent request
// lifecycle (POST /api/analysis-flags), entirely disjoint from this
// page's own server-side data fetching above. It calls no Decision
// Intelligence function and cannot affect this page's own render.
//
// As of Milestone 41, this route also computes staleness via
// isDecisionStale() (lib/decision/refresh, real and unmodified since
// Milestone 31) against a single `now`, so the check is deterministic
// within one render rather than re-evaluating Date.now() implicitly.
// StaleAnalysisBadge only renders the boolean this page hands it — it
// never computes staleness itself.
export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${id}`)}`);
  }

  const project = await getProjectById(id, user.id);

  if (!project) {
    notFound();
  }

  const { verdict } = await buildDecisionArtifacts(project.profile);
  const now = new Date();
  const isStale = isDecisionStale(project.profile, now);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="mb-8 space-y-2">
        <H1>{project.title}</H1>
        <Small className="block text-muted-foreground">Analyzed {formatRelativeTime(project.createdAt)}</Small>
        <StaleAnalysisBadge isStale={isStale} lastUpdated={project.profile.refresh.lastUpdated} />
      </div>

      <DecisionArtifactLinks projectId={project.id} />

      <div className="mb-8 flex justify-end">
        <FlagAnalysisDialog projectId={project.id} />
      </div>

      <DecisionReport profile={project.profile} verification={project.verification} verdict={verdict} />
    </div>
  );
}
