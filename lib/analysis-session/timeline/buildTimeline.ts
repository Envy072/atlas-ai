import { StageNameSchema } from "@/lib/pipeline";
import type { PipelineExecution, StageName } from "@/lib/pipeline";
import type { TimelineEntry } from "@/lib/analysis-session/schemas/timeline.schema";
import { nextTimelineEntryId } from "@/lib/analysis-session/utils/id";

// Derived directly from lib/pipeline's own public StageNameSchema
// (`.options` gives the enum's literal values in declared order) —
// never a second, hand-maintained copy of the six-stage sequence that
// could drift from Pipeline's own ordering.
export const STAGE_ORDER = StageNameSchema.options;

const STAGE_START_LABELS: Record<StageName, string> = {
  research: "Researching your idea...",
  competitors: "Finding your competitors...",
  market: "Analyzing the market...",
  financial: "Reviewing the financials...",
  business: "Synthesizing your business model...",
  decision: "Preparing your decision summary...",
};

const STAGE_COMPLETE_LABELS: Record<StageName, string> = {
  research: "Research complete",
  competitors: "Found your competitors",
  market: "Market analysis complete",
  financial: "Financial review complete",
  business: "Business synthesis complete",
  decision: "Decision summary ready",
};

const STAGE_NEEDS_ATTENTION_LABELS: Record<StageName, string> = {
  research: "We hit a snag researching your idea",
  competitors: "We hit a snag finding your competitors",
  market: "We hit a snag analyzing the market",
  financial: "We hit a snag reviewing the financials",
  business: "We hit a snag synthesizing your business model",
  decision: "We hit a snag preparing your decision summary",
};

const SESSION_STARTED_LABEL = "Analysis started";
const SESSION_COMPLETED_LABEL = "Analysis complete";
const SESSION_CANCELLED_LABEL = "Analysis cancelled";
const SESSION_FAILED_LABEL = "Analysis failed";

// Real, derived composition over lib/pipeline's own stageHistory — never
// generated text (every label is fixed, templated copy above). Per
// MILESTONE_12_DESIGN.md Section 6: one entry per STAGE TRANSITION, not
// one per retry attempt — a stage that failed once and then auto-
// succeeded still shows as a single started/completed pair; the
// intermediate failed attempt is Logs-only (see logs/buildLogs.ts).
export function buildTimeline(execution: PipelineExecution): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: nextTimelineEntryId(),
      timestamp: execution.createdAt,
      kind: "session_started",
      label: SESSION_STARTED_LABEL,
    },
  ];

  for (const stage of STAGE_ORDER) {
    const attemptsForStage = execution.stageHistory.filter((record) => record.stage === stage);
    if (attemptsForStage.length === 0) break; // this stage, and every later one, hasn't started yet

    const firstAttempt = attemptsForStage[0];
    entries.push({
      id: nextTimelineEntryId(),
      timestamp: firstAttempt.startedAt,
      stage,
      kind: "stage_started",
      label: STAGE_START_LABELS[stage],
    });

    const succeededAttempt = attemptsForStage.find((record) => record.status === "succeeded");
    if (succeededAttempt) {
      entries.push({
        id: nextTimelineEntryId(),
        timestamp: succeededAttempt.finishedAt ?? succeededAttempt.startedAt,
        stage,
        kind: "stage_completed",
        label: STAGE_COMPLETE_LABELS[stage],
      });
      continue; // this stage is done — move on to whether the next one has started
    }

    // No successful attempt yet. Only surface "needs attention" once
    // automatic retries are exhausted (state === "stage_failed") — a
    // stage still auto-retrying (retry_pending) hasn't asked the user
    // for anything, so it shows only its "stage_started" entry so far.
    if (execution.state === "stage_failed") {
      const lastAttempt = attemptsForStage[attemptsForStage.length - 1];
      entries.push({
        id: nextTimelineEntryId(),
        timestamp: lastAttempt.finishedAt ?? lastAttempt.startedAt,
        stage,
        kind: "stage_needs_attention",
        label: STAGE_NEEDS_ATTENTION_LABELS[stage],
      });
    }
    break; // this stage hasn't succeeded — nothing after it has started
  }

  if (execution.state === "completed") {
    entries.push({
      id: nextTimelineEntryId(),
      timestamp: execution.updatedAt,
      kind: "session_completed",
      label: SESSION_COMPLETED_LABEL,
    });
  } else if (execution.state === "cancelled") {
    entries.push({
      id: nextTimelineEntryId(),
      timestamp: execution.updatedAt,
      kind: "session_cancelled",
      label: SESSION_CANCELLED_LABEL,
    });
  } else if (execution.state === "failed") {
    entries.push({
      id: nextTimelineEntryId(),
      timestamp: execution.updatedAt,
      kind: "session_failed",
      label: SESSION_FAILED_LABEL,
    });
  }

  return entries;
}
