"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderClock, FileSearch } from "lucide-react";
import type { Project } from "@/lib/schemas/project";
import { formatRelativeTime, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/shared/EmptyState";

interface ReportHistoryPanelProps {
  projects: Project[];
}

const MAX_VISIBLE = 8;

// Real data via the existing, unmodified services/projects.listProjects()
// — the same source Dashboard Home's Recent Projects panel already uses.
// Selecting an item highlights it and shows its (real) headline facts
// here, with a link into the full report at app/projects/[id]
// (MILESTONE_29_DESIGN.md Deliverable 5) — the project detail route
// added in Milestone 29.
export default function ReportHistoryPanel({ projects }: ReportHistoryPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const recent = projects.slice(0, MAX_VISIBLE);
  const selected = recent.find((project) => project.id === selectedId) ?? null;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <FolderClock className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-bold text-card-foreground">History</h2>
          <p className="text-xs text-muted-foreground">Your last analyses</p>
        </div>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          icon={FolderClock}
          title="No saved projects"
          description="Every analysis you run is saved here, most recent first."
        />
      ) : (
        <>
          <ol className="space-y-4 border-l border-border pl-4">
            {recent.map((project) => {
              const isSelected = project.id === selectedId;

              return (
                <li key={project.id} className="relative">
                  <span
                    className={`absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-card ${
                      isSelected ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : project.id)}
                    aria-pressed={isSelected}
                    className={`w-full rounded-lg px-2 py-1 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      isSelected ? "bg-muted/60" : ""
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-card-foreground">{project.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(project.createdAt)} •{" "}
                      {formatPercent(Math.round(project.profile.confidenceSummary.evidenceConfidence))} confidence
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 border-t border-border pt-4">
            {selected ? (
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Selected
                </p>
                <p className="mt-1 truncate text-sm font-medium text-card-foreground">
                  {selected.title ?? "Untitled idea"}
                </p>
                <Link
                  href={`/projects/${selected.id}`}
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  View full report →
                </Link>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  No report selected — click an item above to preview it.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
