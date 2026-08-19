import type { AsyncLocalStorage } from "node:async_hooks";

// Milestone 127 — correlates a provider call, made arbitrarily deep
// inside lib/research/manager/providerManager.ts, back to the pipeline
// execution currently running it — without threading an executionId
// parameter through runResearch()/discoverCompetitors()/discoverMarket()/
// discoverFinancials()/discoverBusiness() and every research-provider
// function in between. Every one of those is a public entry point on a
// different platform, and none has any other reason to accept a
// correlation id — a signature change across all of them, for one
// cross-cutting concern, is exactly what AsyncLocalStorage exists to
// avoid. This is Node's own standard mechanism for carrying a value
// through a chain of awaits/Promise.all calls without it appearing in
// any intermediate function signature. Lives in lib/shared, not
// lib/pipeline, for the same reason timingSchema.ts does — see that
// file's own comment.
//
// The import itself is dynamic (`await import("node:async_hooks")`),
// deliberately not a static top-level `import` — every platform's own
// public barrel (research/competitors/market/financial/business/
// decision) ultimately reuses lib/research's runResearch(), which this
// module's own caller (providerManager.ts) sits behind, and
// PipelineContextSchema (lib/pipeline/schemas/context.schema.ts) reuses
// every platform's own result schema for the Client-Component-reachable
// AnalysisSessionSchema. A static import of a Node-only builtin, present
// ANYWHERE in that reachable module graph — regardless of which specific
// file value-imports it, or via how many barrels — makes Turbopack
// refuse to bundle the client chunk it ends up merged into. A dynamic
// import is a genuine code-split boundary instead: the module is only
// ever actually requested when runWithExecutionId()/getCurrentExecutionId()
// are truly called, which happens exclusively from
// lib/pipeline/engine/pipelineEngine.ts and
// lib/research/manager/providerManager.ts — both server-only, and never
// invoked from any Client Component — so the chunk this resolves to is
// simply never requested by a browser.
let storagePromise: Promise<AsyncLocalStorage<{ executionId: string }>> | undefined;

function getStorage(): Promise<AsyncLocalStorage<{ executionId: string }>> {
  if (!storagePromise) {
    storagePromise = import("node:async_hooks").then((mod) => new mod.AsyncLocalStorage());
  }
  return storagePromise;
}

// Established once per stage attempt, in
// lib/pipeline/engine/pipelineEngine.ts's executeStageWithRetry, around
// the one call already made to every stage (`stage.run(...)`) — every
// provider call nested anywhere inside that stage's own execution,
// however deep, observes the same executionId via getCurrentExecutionId()
// below. `fn` itself is unchanged by this wrapper — same function,
// same return value, same errors; only the surrounding await (to first
// resolve the lazily-loaded storage) is new.
export async function runWithExecutionId<T>(executionId: string, fn: () => Promise<T>): Promise<T> {
  const storage = await getStorage();
  return storage.run({ executionId }, fn);
}

// Returns undefined outside of any tracked stage execution (e.g. a unit
// test calling a discovery function directly) — every call site treats
// that as "don't record," never as an error, so instrumentation never
// changes behavior for a caller that isn't running inside the pipeline.
export async function getCurrentExecutionId(): Promise<string | undefined> {
  const storage = await getStorage();
  return storage.getStore()?.executionId;
}
