import type { PipelineEvent } from "@/lib/pipeline/schemas/event.schema";
import type { PipelineEventListener } from "@/lib/pipeline/types/events";

// A tiny in-process pub/sub, scoped per executionId — the same "Map-
// based, no external broker" spirit as Milestone 5's ProviderManager
// metrics store (MILESTONE_11_DESIGN.md Section 11). Ordering is FIFO
// per executionId because the engine only ever emits synchronously, in
// sequence, from its own sequential stage loop — there is no concurrent
// writer to interleave with. A real message broker for multi-instance
// deployments is a named future extension point (Section 15), not
// needed for this milestone's single-process scope.
const listenersByExecution = new Map<string, Set<PipelineEventListener>>();

export function subscribeToExecution(
  executionId: string,
  listener: PipelineEventListener
): () => void {
  const listeners = listenersByExecution.get(executionId) ?? new Set<PipelineEventListener>();
  listeners.add(listener);
  listenersByExecution.set(executionId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) listenersByExecution.delete(executionId);
  };
}

export function emitPipelineEvent(event: PipelineEvent): void {
  const listeners = listenersByExecution.get(event.executionId);
  if (!listeners) return;
  for (const listener of listeners) listener(event);
}
