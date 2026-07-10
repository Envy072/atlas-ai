import { FolderKanban } from "lucide-react";
import { listProjects } from "@/lib/services/projects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { H1, Small, Body } from "@/components/ui/typography";
import EmptyState from "@/components/shared/EmptyState";

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
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-card-foreground">
                  {project.title}
                </h2>

                {typeof project.score === "number" && (
                  <Badge variant={project.score >= 70 ? "success" : "warning"}>
                    Score {project.score}
                  </Badge>
                )}
              </div>

              <Body className="mb-6 text-muted-foreground">{project.summary}</Body>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Small className="mb-2 block text-muted-foreground">Problem</Small>
                  <p className="leading-7 text-card-foreground">{project.problem}</p>
                </div>

                <div>
                  <Small className="mb-2 block text-muted-foreground">Solution</Small>
                  <p className="leading-7 text-card-foreground">{project.solution}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
