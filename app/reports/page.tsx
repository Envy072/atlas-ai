import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { listProjects } from "@/lib/services/projects";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { H1, Small } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";
import DecisionArtifactLinks from "@/components/workspace/decision-report/DecisionArtifactLinks";

// Replaces the previous "coming soon" stub (Milestone 101). Not a new
// knowledge platform or a new report type — every artifact this page
// links to (Executive Summary, Investment Memo, Due Diligence Report)
// and the project data itself already existed; this page only gives
// the user's full report set its own report-centric list, distinct
// from /projects' own analysis-centric one, reusing
// DecisionArtifactLinks unchanged for each project.
export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await listProjects(user.id);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <H1>Reports</H1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every report generated from your analyzed projects, in one place.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Run your first analysis and its reports will show up here."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <Card key={project.id} className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight text-card-foreground">{project.title}</h2>
                <Small className="text-muted-foreground">{formatDate(project.createdAt)}</Small>
              </div>
              <DecisionArtifactLinks projectId={project.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
