"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, RotateCcw, XCircle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { formatProgress, STAGE_ORDER } from "@/lib/analysis-session";
import type { AnalysisSession, TimelineEntry } from "@/lib/analysis-session";
import { isTerminalSessionState } from "@/hooks/useAnalysisSession";

// Derived structurally from the already-public STAGE_ORDER constant
// rather than importing StageName from lib/pipeline directly — Session's
// own barrel deliberately doesn't re-export Pipeline's types
// (MILESTONE_12_DESIGN.md), so this stays consistent with "consume only
// public APIs" without adding a new import edge to lib/pipeline.
type StageName = (typeof STAGE_ORDER)[number];

interface SessionProgressExperienceProps {
  session: AnalysisSession;
  onCancel: () => void;
  onRetry: () => void;
}

const CANCELLABLE_STATES = new Set<AnalysisSession["state"]>(["starting", "analyzing", "waiting_retry"]);

// Session states this component ever actually renders for
// ("completed" switches AIWorkspace to DecisionReport instead —
// MILESTONE_15_DESIGN.md Section 6) — no entry for "completed" here,
// since it would be unreachable dead mapping.
const STATE_PILL: Record<Exclude<AnalysisSession["state"], "completed">, {
  label: string;
  tone: "primary" | "warning" | "destructive" | "neutral";
  pulse: boolean;
}> = {
  starting: { label: "Starting", tone: "primary", pulse: true },
  analyzing: { label: "Analyzing", tone: "primary", pulse: true },
  waiting_retry: { label: "Retrying", tone: "warning", pulse: true },
  needs_attention: { label: "Needs attention", tone: "warning", pulse: false },
  cancelling: { label: "Cancelling", tone: "warning", pulse: true },
  cancelled: { label: "Cancelled", tone: "neutral", pulse: false },
  failed: { label: "Failed", tone: "destructive", pulse: false },
};

const STAGE_LABELS: Record<StageName, string> = {
  research: "Research",
  competitors: "Competitors",
  market: "Market",
  financial: "Financial",
  business: "Business",
  decision: "Decision",
};

// Matches the pipeline's own real, observed range (Milestone 45
// investigation) — not a guess. Past this, the message switches from
// the upfront estimate to an honest "still running" state rather than
// leaving the same static text up indefinitely.
const STILL_RUNNING_THRESHOLD_SECONDS = 40;

// Ticks once a second while the session is active, purely to drive the
// estimated-time copy below — never affects `progress`/`timeline`
// themselves, which stay exactly what the server last reported.
function useElapsedSeconds(startedAt: string, active: boolean): number {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - Date.parse(startedAt)) / 1000));

  useEffect(() => {
    if (!active) return;

    const tick = () => setElapsed(Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, active]);

  return elapsed;
}

type StepStatus = "done" | "current" | "attention" | "pending";

const STEP_STATUS_CLASSNAME: Record<StepStatus, string> = {
  done: "bg-success",
  current: "bg-primary",
  attention: "bg-warning",
  pending: "bg-muted",
};

// Derived fresh from the timeline every render — O(6) against a
// constant-length array, not memoized (MILESTONE_15_DESIGN.md's
// Performance Strategy: no memoization without a measured reason).
function computeStepStatuses(timeline: TimelineEntry[]): Record<StageName, StepStatus> {
  const statuses = {} as Record<StageName, StepStatus>;

  for (const stage of STAGE_ORDER) {
    const hasCompleted = timeline.some((entry) => entry.stage === stage && entry.kind === "stage_completed");
    const hasAttention = timeline.some((entry) => entry.stage === stage && entry.kind === "stage_needs_attention");
    const hasStarted = timeline.some((entry) => entry.stage === stage && entry.kind === "stage_started");

    statuses[stage] = hasCompleted ? "done" : hasAttention ? "attention" : hasStarted ? "current" : "pending";
  }

  return statuses;
}

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

function TimelineList({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <ul className="space-y-3">
      {timeline.map((entry) => (
        <li key={entry.id} className="flex items-center gap-3 text-sm">
          {timelineIcon(entry.kind)}
          <span className="text-foreground">{entry.label}</span>
        </li>
      ))}
    </ul>
  );
}

// Real stage/percent, a compact stage stepper, and the Timeline list in
// one component (merged in Milestone 14, extended in Milestone 15 —
// MILESTONE_15_DESIGN.md Section 9). Every value here is read directly
// from AnalysisSession — no new progress math, no new timeline logic
// (Section 8's boundary rule, unchanged).
export default function SessionProgressExperience({
  session,
  onCancel,
  onRetry,
}: SessionProgressExperienceProps) {
  const { timeline, progress, state } = session;
  const lastEntry = timeline[timeline.length - 1];
  const currentStage = state === "analyzing" ? lastEntry?.stage : undefined;

  const headline = formatProgress(progress, currentStage);
  const canCancel = CANCELLABLE_STATES.has(state);
  const needsAttention = state === "needs_attention";
  const terminal = isTerminalSessionState(state);
  const pill = state === "completed" ? undefined : STATE_PILL[state];
  const stepStatuses = computeStepStatuses(timeline);

  const elapsedSeconds = useElapsedSeconds(session.createdAt, !terminal);
  const stillRunning = !terminal && elapsedSeconds >= STILL_RUNNING_THRESHOLD_SECONDS;
  const timeEstimate = stillRunning
    ? "This analysis is still running. Large reports may take up to one minute."
    : "Usually takes 20-40 seconds.";

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        {pill && <StatusPill label={pill.label} tone={pill.tone} pulse={pill.pulse} />}

        <div className="flex items-center gap-2">
          {needsAttention && (
            <Button size="sm" onClick={onRetry} className="gap-1.5">
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

      <ol className="mb-4 flex items-center gap-1.5" aria-label="Analysis stages">
        {STAGE_ORDER.map((stage) => {
          const status = stepStatuses[stage];
          const isCurrentStep = status === "current" || status === "attention";

          return (
            <li
              key={stage}
              aria-current={isCurrentStep ? "step" : undefined}
              className={cn("h-1.5 flex-1 rounded-full", STEP_STATUS_CLASSNAME[status])}
            >
              <span className="sr-only">
                {STAGE_LABELS[stage]} — {status}
              </span>
            </li>
          );
        })}
      </ol>

      <p className={cn("text-sm font-medium text-foreground", terminal ? "mb-4" : "mb-1.5")}>{headline}</p>

      {!terminal && (
        <p className={cn("mb-4 text-xs", stillRunning ? "text-warning" : "text-muted-foreground")}>
          {timeEstimate}
        </p>
      )}

      <Progress value={progress.percent} className="mb-6" />

      {terminal ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-open:rotate-90" />
            Show timeline ({timeline.length} events)
          </summary>
          <div className="mt-4">
            <TimelineList timeline={timeline} />
          </div>
        </details>
      ) : (
        <TimelineList timeline={timeline} />
      )}
    </Card>
  );
}
