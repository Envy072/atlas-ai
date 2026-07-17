import Link from "next/link";
import { ClipboardList, Briefcase, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DecisionArtifactLinksProps {
  projectId: string;
}

// Makes the three Decision Intelligence artifacts (Executive Summary,
// Investment Memo, Due Diligence Report) discoverable from a project's
// own detail page — each was reachable only by typing its exact URL
// directly until this component existed (MILESTONE_31_DESIGN.md
// Deliverable 7). Reuses the exact Button + render={<Link .../>}
// composition already used for this kind of action elsewhere
// (RecentProjectsPanel, DashboardWelcome) — no new navigation pattern.
export default function DecisionArtifactLinks({ projectId }: DecisionArtifactLinksProps) {
  return (
    <div className="mb-8 flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="sm"
        render={<Link href={`/projects/${projectId}/executive-summary`} />}
        className="gap-1.5"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Executive Summary
      </Button>
      <Button
        variant="secondary"
        size="sm"
        render={<Link href={`/projects/${projectId}/memo`} />}
        className="gap-1.5"
      >
        <Briefcase className="h-3.5 w-3.5" />
        Investment Memo
      </Button>
      <Button
        variant="secondary"
        size="sm"
        render={<Link href={`/projects/${projectId}/diligence`} />}
        className="gap-1.5"
      >
        <FileSearch className="h-3.5 w-3.5" />
        Due Diligence Report
      </Button>
    </div>
  );
}
