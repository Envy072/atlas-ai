import { FolderKanban } from "lucide-react";
import { listProjects } from "@/lib/services/projects";
import { formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { H1, Small, Body } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";

// project.score/problem/solution (the old AnalysisResult-shaped fields)
// have no equivalent in DecisionProfile — no numeric score is ever
// fabricated anywhere in this codebase (MILESTONE_26_DESIGN.md Section
// 6). "Confidence" is a real, data-quality figure from
// confidenceSummary, honestly labeled as confidence, not a verdict;
// customerProblem/valueProposition are BusinessSummary's real, optional
// fields, each falling back to an honest "Not yet known" rather than a
// blank space.
export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-8">Projects</H1>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Every startup idea you analyze is saved here, most recent first."
          />
        </Card>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => {
            const { businessSummary, confidenceSummary } = project.profile;

            return (
              <Card
                key={project.id}
                className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold tracking-tight text-card-foreground">
                    {project.title}
                  </h2>

                  <Badge variant="secondary">
                    Confidence {formatPercent(Math.round(confidenceSummary.evidenceConfidence))}
                  </Badge>
                </div>

                <Body className="mb-6 text-muted-foreground">
                  {businessSummary.valueProposition ?? businessSummary.businessModel ?? "No summary available."}
                </Body>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Small className="mb-2 block text-muted-foreground">Problem</Small>
                    <p className="leading-7 text-card-foreground">
                      {businessSummary.customerProblem ?? "Not yet known."}
                    </p>
                  </div>

                  <div>
                    <Small className="mb-2 block text-muted-foreground">Solution</Small>
                    <p className="leading-7 text-card-foreground">
                      {businessSummary.valueProposition ?? "Not yet known."}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
