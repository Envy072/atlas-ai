import Link from "next/link";
import { FolderKanban, Sparkles } from "lucide-react";
import type { ProjectRecord } from "@/lib/services/projects";
import { formatRelativeTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";

interface RecentProjectsPanelProps {
  projects: ProjectRecord[];
}

const MAX_VISIBLE = 5;

// Real data from services/projects.listProjects() — no fabricated demo
// projects. Rows aren't links yet: there's no project detail route
// (app/projects/[id]) in this app today, so linking each row would 404.
// See DASHBOARD.md's Future Extension Points.
export default function RecentProjectsPanel({ projects }: RecentProjectsPanelProps) {
  const recent = projects.slice(0, MAX_VISIBLE);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Recent Projects</h2>
          <p className="text-sm text-muted-foreground">Your latest startup ideas</p>
        </div>

        <Button variant="secondary" size="sm" render={<Link href="/projects" />}>
          View all
        </Button>
      </div>

      <div className="flex-1 divide-y divide-border">
        {recent.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            action={
              <Button size="sm" render={<Link href="/dashboard/analysis" />} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Analyze your first idea
              </Button>
            }
          />
        ) : (
          recent.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between gap-4 p-5 transition-colors duration-150 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-card-foreground">
                  {project.title ?? "Untitled idea"}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {project.summary ?? "No summary available."}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end">
                <span className="text-2xl font-bold text-primary">
                  {project.score ?? "--"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(project.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
