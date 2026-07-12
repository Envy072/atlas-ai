"use client";

"use client";

import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, XCircle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatProgress } from "@/lib/analysis-session";
import type { AnalysisSession } from "@/lib/analysis-session";
import type { TimelineEntry } from "@/lib/analysis-session";

interface SessionProgressExperienceProps {
  session: AnalysisSession;
  onCancel: () => void;
  onRetry: () => void;
}

const CANCELLABLE_STATES = new Set<AnalysisSession["state"]>(["starting", "analyzing", "waiting_retry"]);

const STATE_HEADLINES: Partial<Record<AnalysisSession["state"], string>> = {
  starting: "Starting analysis…",
  waiting_retry: "Retrying automatically…",
  cancelling: "Cancelling…",
  cancelled: "Analysis cancelled.",
  failed: "Analysis failed.",
};

function timelineIcon(kind: TimelineEntry["kind"]) {
  if (kind === "stage_completed" || kind === "session_completed") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
  }
  if (kind === "stage_needs_attention" || kind === "session_failed") {
    return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
  }
  if (kind === "session_cancelled") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />;
  }
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
}

// Real stage/percent AND the Timeline list in one component
// (MILESTONE_14_DESIGN.md Section 22 — merged during the complexity
// review), replacing AIThinkingExperience's fixed-timer fake stages.
// Every value here is read directly from AnalysisSession — no new
// progress math, no new timeline logic (Section 8's boundary rule).
export default function SessionProgressExperience({
  session,
  onCancel,
  onRetry,
}: SessionProgressExperienceProps) {
  const { timeline, progress, state } = session;
  const lastEntry = timeline[timeline.length - 1];
  const currentStage = state === "analyzing" ? lastEntry?.stage : undefined;

  const headline = STATE_HEADLINES[state] ?? formatProgress(progress, currentStage);
  const canCancel = CANCELLABLE_STATES.has(state);
  const needsAttention = state === "needs_attention";

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {needsAttention || state === "failed" ? (
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          )}
          <p className="text-sm font-medium text-foreground">{headline}</p>
        </div>

        <div className="flex items-center gap-2">
          {needsAttention && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Progress value={progress.percent} className="mb-6" />

      <ul className="space-y-3">
        {timeline.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 text-sm">
            {timelineIcon(entry.kind)}
            <span className="text-foreground">{entry.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
