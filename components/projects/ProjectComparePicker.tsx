"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProjectOption {
  id: string;
  title: string;
}

interface ProjectComparePickerProps {
  projects: ProjectOption[];
  initialLeft: string | null;
  initialRight: string | null;
}

// The one interactive piece of Idea Comparison (Milestone 49) —
// everything else on this route (app/projects/compare/page.tsx,
// ProjectComparisonView) is a plain Server Component. Owns only the two
// selections and the navigation to build; no data fetching, no
// comparison rendering happens here.
export default function ProjectComparePicker({ projects, initialLeft, initialRight }: ProjectComparePickerProps) {
  const router = useRouter();
  const [left, setLeft] = useState<string | null>(initialLeft);
  const [right, setRight] = useState<string | null>(initialRight);

  const bothSelected = left !== null && right !== null;
  const isSameProject = bothSelected && left === right;
  const canCompare = bothSelected && !isSameProject;

  function handleCompare() {
    if (!canCompare) return;
    router.push(`/projects/compare?left=${left}&right=${right}`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="compare-left">
            First analysis
          </label>
          <Select value={left} onValueChange={setLeft}>
            <SelectTrigger id="compare-left" aria-label="First analysis">
              <SelectValue placeholder="Choose an analysis" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="compare-right">
            Second analysis
          </label>
          <Select value={right} onValueChange={setRight}>
            <SelectTrigger id="compare-right" aria-label="Second analysis">
              <SelectValue placeholder="Choose an analysis" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alert already renders role="alert" itself (components/ui/alert.tsx)
          — an assertive live region, so a screen reader announces this the
          moment it appears with no extra aria-live needed here. */}
      {isSameProject && (
        <Alert variant="destructive">
          <AlertDescription>Please select two different analyses.</AlertDescription>
        </Alert>
      )}

      <Button disabled={!canCompare} onClick={handleCompare}>
        Compare
      </Button>
    </div>
  );
}
