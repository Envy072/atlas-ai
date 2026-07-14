import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import { listProjects } from "@/lib/services/projects";
import type { Project } from "@/lib/schemas/project";
import type { CompanyProfile } from "@/lib/competitors";
import { Card } from "@/components/ui/card";
import { H1 } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";
import { CompetitorSubCard } from "@/components/workspace/decision-report/CompetitorIntelligenceCard";

interface AggregatedCompetitor {
  competitor: CompanyProfile;
  projects: Project[];
}

// Groups a user's keyCompetitors across all of their own projects by
// company name (case-insensitive), so the same real-world competitor
// mentioned in two projects appears once, listing both source projects
// — not as two separate, duplicate-looking entries
// (MILESTONE_29_DESIGN.md Deliverable 1).
function aggregateCompetitors(projects: Project[]): AggregatedCompetitor[] {
  const byName = new Map<string, AggregatedCompetitor>();

  for (const project of projects) {
    for (const competitor of project.profile.keyCompetitors) {
      const key = competitor.name.trim().toLowerCase();
      const existing = byName.get(key);

      if (existing) {
        existing.projects.push(project);
      } else {
        byName.set(key, { competitor, projects: [project] });
      }
    }
  }

  return Array.from(byName.values());
}

// Replaces the previous copy-paste bug (this file used to render
// ProjectsPage's own content). A minimal aggregation view, not a new
// Competitor Intelligence Hub: it reads only this user's own,
// already-persisted projects (the same RLS-scoped listProjects() every
// other authenticated page here uses) and reuses CompetitorSubCard
// unchanged for each unique competitor — no new competitor-rendering
// logic, no new knowledge-platform work.
//
// Protected by middleware.ts's PROTECTED_PATHS (this milestone adds
// "/competitors" there), since this page now reads a signed-in user's
// own data — it was never protected before because it never read
// anything real.
export default async function CompetitorsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await listProjects(user.id);
  const aggregated = aggregateCompetitors(projects);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <H1>Competitors</H1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every competitor identified across your analyzed projects.
        </p>
      </div>

      {aggregated.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No competitors found yet"
            description="Competitors identified while analyzing your projects will show up here. This is expected without a configured search-provider in this environment — not an error."
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {aggregated.map(({ competitor, projects: mentioningProjects }) => (
            <div key={competitor.id}>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Mentioned in{" "}
                {mentioningProjects.map((project, index) => (
                  <span key={project.id}>
                    {index > 0 && ", "}
                    <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                      {project.title}
                    </Link>
                  </span>
                ))}
              </p>
              <CompetitorSubCard competitor={competitor} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
