"use client";

import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LoadingChecklistProps {
  title: string;
  items: string[];
}

// A vertical list of "spinner + label" rows shown while an analysis is in
// flight, used instead of hand-writing one row per step. The indeterminate
// progress bar (value=null) is honest about there being no real per-step
// percentage available from the single-call analyze endpoint — it signals
// "in progress," not a fabricated completion percentage.
export default function LoadingChecklist({ title, items }: LoadingChecklistProps) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-6">
      <h3 className="mb-4 text-xl font-bold text-foreground">{title}</h3>

      <Progress value={null} className="mb-6" />

      <div className="space-y-4 text-foreground/80">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
