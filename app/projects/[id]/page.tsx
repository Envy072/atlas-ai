import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { getProjectById } from "@/lib/services/projects";
import { buildDecisionArtifacts } from "@/lib/decision";
import { formatRelativeTime } from "@/lib/format";
import { H1, Small } from "@/components/ui/typography";
import DecisionReport from "@/components/workspace/decision-report/DecisionReport";
import DecisionArtifactLinks from "@/components/workspace/decision-report/DecisionArtifactLinks";

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

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <div className="mb-8">
        <H1>{project.title}</H1>
        <Small className="mt-1 block text-muted-foreground">
          Analyzed {formatRelativeTime(project.createdAt)}
        </Small>
      </div>

      <DecisionArtifactLinks projectId={project.id} />

      <DecisionReport profile={project.profile} verification={project.verification} verdict={verdict} />
    </div>
  );
}
