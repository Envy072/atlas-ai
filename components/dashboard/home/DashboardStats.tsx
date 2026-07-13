"use client";

import { FolderKanban, TrendingUp, Trophy, CalendarClock } from "lucide-react";
import type { Project } from "@/lib/schemas/project";
import { formatPercent } from "@/lib/format";
import IconBadge from "@/components/shared/IconBadge";
import { Card } from "@/components/ui/card";

interface DashboardStatsProps {
  projects: Project[];
}

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

// "Confidence," not "Score": DecisionProfile never produces a business-
// quality verdict (MILESTONE_26_DESIGN.md Section 6) —
// confidenceSummary.evidenceConfidence is a real but distinct
// data-quality figure, and labeling it "Score" would misrepresent it.
function toConfidenceScores(projects: Project[]): number[] {
  return projects.map((project) => project.profile.confidenceSummary.evidenceConfidence);
}

// Kept outside the component so the (impure) Date.now() read isn't a
// direct call inside a component's render body.
function countProjectsThisWeek(projects: Project[]): number {
  const now = Date.now();

  return projects.filter((project) => {
    const createdAt = Date.parse(project.createdAt);
    return !Number.isNaN(createdAt) && now - createdAt <= WEEK_IN_MS;
  }).length;
}

// All four figures are derived directly from the real projects list — no
// fabricated numbers. Each falls back to "--" when there isn't enough data
// yet rather than showing a misleading 0.
export default function DashboardStats({ projects }: DashboardStatsProps) {
  const confidenceScores = toConfidenceScores(projects);
  const averageConfidence =
    confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((sum, s) => sum + s, 0) / confidenceScores.length)
      : null;
  const highestConfidence = confidenceScores.length > 0 ? Math.round(Math.max(...confidenceScores)) : null;
  const projectsThisWeek = countProjectsThisWeek(projects);

  const stats = [
    {
      title: "Total Projects",
      value: String(projects.length),
      icon: FolderKanban,
      bgClassName: "bg-primary/10",
      textClassName: "text-primary",
    },
    {
      title: "Average Confidence",
      value: averageConfidence !== null ? formatPercent(averageConfidence) : "--",
      icon: TrendingUp,
      bgClassName: "bg-success/10",
      textClassName: "text-success",
    },
    {
      title: "Highest Confidence",
      value: highestConfidence !== null ? formatPercent(highestConfidence) : "--",
      icon: Trophy,
      bgClassName: "bg-info/10",
      textClassName: "text-info",
    },
    {
      title: "Analyzed This Week",
      value: String(projectsThisWeek),
      icon: CalendarClock,
      bgClassName: "bg-warning/15",
      textClassName: "text-warning",
    },
  ];

  return (
    <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
        >
          <IconBadge icon={stat.icon} bgClassName={stat.bgClassName} textClassName={stat.textClassName} />

          <p className="mt-6 text-sm text-muted-foreground">{stat.title}</p>
          <h2 className="mt-1 text-4xl font-bold tracking-tight text-card-foreground">
            {stat.value}
          </h2>
        </Card>
      ))}
    </section>
  );
}
