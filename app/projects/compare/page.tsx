import { redirect } from "next/navigation";
import { GitCompare } from "lucide-react";
import { listProjects, getProjectById } from "@/lib/services/projects";
import { getCurrentUser } from "@/lib/services/auth";
import { H1, Body } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/shared/EmptyState";
import ProjectComparePicker from "@/components/projects/ProjectComparePicker";
import ProjectComparisonView from "@/components/projects/ProjectComparisonView";

interface ProjectsComparePageProps {
  searchParams: Promise<{ left?: string; right?: string }>;
}

// Idea Comparison (Milestone 49) — compares exactly two of a founder's
// own analyses, side by side, using only already-persisted Project data
// (getProjectById/listProjects, both pre-existing and already
// ownership-checked). No new service, no new API route, no schema
// change: this Server Component is the entire backend for this feature.
//
// Already protected by middleware.ts's PROTECTED_PATHS (/projects
// covers this nested route too) — this check supplies the real user id
// listProjects()/getProjectById() require, matching every other
// protected page's own established pattern.
export default async function ProjectsComparePage({ searchParams }: ProjectsComparePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=%2Fprojects%2Fcompare");
  }

  const { left, right } = await searchParams;
  const allProjects = await listProjects(user.id);

  if (allProjects.length < 2) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <H1 className="mb-8">Compare Analyses</H1>
        <Card>
          <EmptyState
            icon={GitCompare}
            title="Not enough analyses yet"
            description="Comparing two analyses needs at least two saved projects — run one more, then come back here."
          />
        </Card>
      </div>
    );
  }

  // A tampered or stale id in the URL degrades safely: getProjectById
  // already returns null for a nonexistent or not-owned id (the same
  // ownership check every other project route relies on), and left ===
  // right is treated as "nothing selected yet" here — the picker itself
  // is the one place that shows the actual "choose two different
  // analyses" validation message.
  const hasDistinctSelection = !!left && !!right && left !== right;
  const [leftProject, rightProject] = hasDistinctSelection
    ? await Promise.all([getProjectById(left, user.id), getProjectById(right, user.id)])
    : [null, null];

  return (
    <div className="mx-auto max-w-5xl p-8">
      <H1 className="mb-2">Compare Analyses</H1>
      <Body className="mb-8 text-muted-foreground">
        Choose two of your saved analyses to see them side by side.
      </Body>

      <Card className="mb-8 p-6">
        <ProjectComparePicker projects={allProjects} initialLeft={left ?? null} initialRight={right ?? null} />
      </Card>

      {hasDistinctSelection &&
        (leftProject && rightProject ? (
          <ProjectComparisonView left={leftProject} right={rightProject} />
        ) : (
          <Card>
            <EmptyState
              icon={GitCompare}
              title="Analysis not found"
              description="One or both selected analyses could not be found — choose two analyses from the list above."
            />
          </Card>
        ))}
    </div>
  );
}
