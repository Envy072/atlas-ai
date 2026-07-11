import type { PipelineExecution } from "@/lib/pipeline";
import type { SessionRecord, AnalysisSession } from "@/lib/analysis-session/schemas/session.schema";
import { AnalysisSessionSchema } from "@/lib/analysis-session/schemas/session.schema";
import { projectSessionState } from "@/lib/analysis-session/state/projectSessionState";
import { buildTimeline } from "@/lib/analysis-session/timeline/buildTimeline";
import { parseOrThrow } from "@/lib/validation/parse";

// The one place a full AnalysisSession gets composed — always derived
// fresh from a SessionRecord's own tiny metadata plus the underlying
// PipelineExecution, never assembled from a second stored copy
// (MILESTONE_12_DESIGN.md Section 10's "derived, not duplicated" rule —
// and Section 20's comparison table: Session holds no source of truth of
// its own). `updatedAt` reflects the execution's own freshness (the
// record's own `updatedAt` only ever changes if the session's metadata
// itself is edited, which nothing in this milestone does yet).
export function composeAnalysisSession(
  record: SessionRecord,
  execution: PipelineExecution
): AnalysisSession {
  return parseOrThrow(
    AnalysisSessionSchema,
    {
      id: record.id,
      executionId: record.executionId,
      title: record.title,
      startupIdea: record.startupIdea,
      state: projectSessionState(execution.state),
      progress: execution.progress,
      timeline: buildTimeline(execution),
      createdAt: record.createdAt,
      updatedAt: execution.updatedAt,
      result: execution.context.decision,
    },
    "Failed to build a schema-valid AnalysisSession."
  );
}
