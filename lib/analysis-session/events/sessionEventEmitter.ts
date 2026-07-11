import { subscribeToExecution, getExecution } from "@/lib/pipeline";
import type { PipelineEvent, PipelineEventType } from "@/lib/pipeline";
import type { SessionEventType } from "@/lib/analysis-session/schemas/enums";
import type { SessionEventListener } from "@/lib/analysis-session/types/events";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";
import { buildTimeline } from "@/lib/analysis-session/timeline/buildTimeline";
import { defaultAnalysisSessionStore } from "@/lib/analysis-session/storage/defaultStore";

// Pipeline events with a direct, unconditional Session equivalent
// (MILESTONE_12_DESIGN.md Section 8).
const DIRECT_EVENT_MAP: Partial<Record<PipelineEventType, SessionEventType>> = {
  "pipeline.started": "session.started",
  "pipeline.cancelling": "session.cancelling",
  "pipeline.cancelled": "session.cancelled",
  "pipeline.completed": "session.completed",
  "pipeline.failed": "session.failed",
};

async function translateAndEmit(
  pipelineEvent: PipelineEvent,
  sessionId: string,
  listener: SessionEventListener
): Promise<void> {
  const execution = await getExecution(pipelineEvent.executionId);
  if (!execution) return;

  const timeline = buildTimeline(execution);
  const latestEntry = timeline[timeline.length - 1];

  const directType = DIRECT_EVENT_MAP[pipelineEvent.type];
  if (directType) {
    listener({
      type: directType,
      sessionId,
      timestamp: pipelineEvent.timestamp,
      message: pipelineEvent.message,
      timelineEntry: latestEntry,
    });
    return;
  }

  if (pipelineEvent.type === "stage.failed" && execution.state === "stage_failed") {
    listener({
      type: "session.needs_attention",
      sessionId,
      timestamp: pipelineEvent.timestamp,
      message: pipelineEvent.message,
      timelineEntry: latestEntry,
    });
    return;
  }

  if (pipelineEvent.type === "stage.started" || pipelineEvent.type === "stage.completed") {
    listener({
      type: "timeline.updated",
      sessionId,
      timestamp: pipelineEvent.timestamp,
      timelineEntry: latestEntry,
    });
  }

  // "stage.retry_scheduled" and a "stage.failed" that still has retries
  // remaining intentionally produce no SessionEvent — that detail is
  // Logs-only (Section 9), collapsed out of the user-facing Timeline and
  // event stream exactly as Section 6 specifies.
}

// Subscribes to a session's underlying pipeline execution and re-emits
// its events in Session's own vocabulary (Section 8). Looks up the
// session's executionId asynchronously but returns the unsubscribe
// function synchronously, matching the Public API shape in Section 10 —
// via an eager-unsubscribe guard: calling the returned function before
// the async lookup resolves correctly prevents the underlying Pipeline
// subscription from ever being established.
export function subscribeToSession(
  sessionId: string,
  listener: SessionEventListener,
  store: AnalysisSessionStore = defaultAnalysisSessionStore
): () => void {
  let unsubscribed = false;
  let realUnsubscribe: (() => void) | null = null;

  void (async () => {
    const record = await store.getById(sessionId);
    if (!record || unsubscribed) return;

    realUnsubscribe = subscribeToExecution(record.executionId, (pipelineEvent) => {
      void translateAndEmit(pipelineEvent, sessionId, listener);
    });
  })();

  return () => {
    unsubscribed = true;
    realUnsubscribe?.();
  };
}
