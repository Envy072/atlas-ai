"use client";

import Link from "next/link";
import { Activity, Sparkles } from "lucide-react";
import type { ProjectRecord } from "@/lib/services/projects";
import { formatRelativeTime } from "@/lib/format";
import IconBadge from "@/components/shared/IconBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";

interface RecentActivityPanelProps {
  projects: ProjectRecord[];
}

const MAX_VISIBLE = 5;

// There's no dedicated activity/event log in the database yet — that
// would be a new data model, out of scope for this design-system sprint.
// Rather than fabricate a fake activity feed, this derives real activity
// entries from the same project data Recent Projects already uses
// ("analysis completed for X").
export default function RecentActivityPanel({ projects }: RecentActivityPanelProps) {
  const recent = projects.slice(0, MAX_VISIBLE);

  return (
    <Card className="flex flex-col">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-bold text-card-foreground">Recent Activity</h2>
        <p className="text-sm text-muted-foreground">What Atlas AI has done lately</p>
      </div>

      <div className="flex-1 divide-y divide-border">
        {recent.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            action={
              <Button size="sm" render={<Link href="/dashboard/analysis" />} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Run your first analysis
              </Button>
            }
          />
        ) : (
          recent.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-4 p-5 transition-colors duration-150 hover:bg-muted/40"
            >
              <IconBadge icon={Sparkles} size="sm" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-card-foreground">
                  Analysis completed for{" "}
                  <span className="font-semibold">{project.title ?? "an idea"}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(project.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
