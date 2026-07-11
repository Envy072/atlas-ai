import type { PipelineExecution, StageRecord } from "@/lib/pipeline";
import type { LogEntry } from "@/lib/analysis-session/schemas/log.schema";

// Whether `record` is the LAST attempt so far at its own stage (within
// this snapshot of stageHistory) — distinguishes "still auto-retrying"
// (warn) from "this is where it currently stands, unresolved" (error),
// without needing to know whether a future retry will still come.
function isLastAttemptForStage(stageHistory: StageRecord[], index: number): boolean {
  const record = stageHistory[index];
  return !stageHistory.slice(index + 1).some((later) => later.stage === record.stage);
}

function attemptLogEntries(record: StageRecord, isLastAttempt: boolean): LogEntry[] {
  const entries: LogEntry[] = [
    {
      timestamp: record.startedAt,
      level: "info",
      message: `Started ${record.stage} (attempt ${record.attempt}, ${record.trigger}).`,
      stage: record.stage,
      attempt: record.attempt,
    },
  ];

  if (record.status === "succeeded") {
    entries.push({
      timestamp: record.finishedAt ?? record.startedAt,
      level: "info",
      message: `Completed ${record.stage} (attempt ${record.attempt}) in ${record.durationMs ?? 0}ms.`,
      stage: record.stage,
      attempt: record.attempt,
    });
  } else if (record.status === "failed") {
    entries.push({
      timestamp: record.finishedAt ?? record.startedAt,
      level: isLastAttempt ? "error" : "warn",
      message: `${record.stage} attempt ${record.attempt} failed: ${record.errorMessage ?? "unknown error"}.`,
      stage: record.stage,
      attempt: record.attempt,
    });
  }

  return entries;
}

// The verbose counterpart to buildTimeline() (MILESTONE_12_DESIGN.md
// Section 9) — every attempt, every transition, nothing collapsed. Real,
// derived composition over the same stageHistory Timeline reads; no new
// information is invented, only reformatted from what
// PipelineExecution.stageHistory already honestly records.
export function buildLogs(execution: PipelineExecution): LogEntry[] {
  const entries: LogEntry[] = [
    { timestamp: execution.createdAt, level: "info", message: "Analysis session started." },
  ];

  execution.stageHistory.forEach((record, index) => {
    entries.push(...attemptLogEntries(record, isLastAttemptForStage(execution.stageHistory, index)));
  });

  if (execution.state === "stage_failed") {
    entries.push({
      timestamp: execution.updatedAt,
      level: "error",
      message: `Needs attention: ${execution.errorSummary ?? "unknown error"}`,
    });
  } else if (execution.state === "completed") {
    entries.push({ timestamp: execution.updatedAt, level: "info", message: "Analysis complete." });
  } else if (execution.state === "cancelled") {
    entries.push({ timestamp: execution.updatedAt, level: "warn", message: "Analysis cancelled." });
  } else if (execution.state === "failed") {
    entries.push({
      timestamp: execution.updatedAt,
      level: "error",
      message: `Analysis failed: ${execution.errorSummary ?? "unknown error"}`,
    });
  }

  return entries;
}
