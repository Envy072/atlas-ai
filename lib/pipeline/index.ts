// Public entry point for the Execution Pipeline (Milestone 11). Every
// future UI/dashboard consumer should import from here, never from a
// deep path into a specific subfolder — the same discipline every Phase
// 1 platform's own public barrel enforces for itself.
export {
  startPipeline,
  resumePipeline,
  retryStage,
  cancelPipeline,
  getExecution,
  subscribeToExecution,
} from "@/lib/pipeline/engine/pipelineEngine";

export { canTransition, isTerminalState, assertTransition } from "@/lib/pipeline/state/stateMachine";
export { computeProgress, TOTAL_STAGES } from "@/lib/pipeline/progress/progressCalculator";
export {
  DEFAULT_PIPELINE_RETRY_POLICY,
  computeBackoffMs,
  countAutoRetries,
  countManualRetries,
} from "@/lib/pipeline/retry";

export { createStore } from "@/lib/pipeline/storage/createStore";
export { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";

export * from "@/lib/pipeline/schemas";
export * from "@/lib/pipeline/types";
