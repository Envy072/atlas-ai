import { describe, it, expect, vi, afterEach } from "vitest";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";

// vi.mock is hoisted above all top-level bindings in this file, so the
// shared store must be created inside the mock factory itself — a plain
// top-level const (as pipelineEngine.ts's own real defaultStore binding
// uses) isn't initialized yet by the time this factory runs. One
// instance shared across the whole file, cached after the first
// createStore() call (mirroring pipelineEngine.ts's own module-level
// singleton, since resumePipeline()/getSession() must all see the same
// store).
vi.mock("@/lib/pipeline/storage/createStore", async () => {
  const { MemoryPipelineStore } = await import("@/lib/pipeline/storage/memoryStore");
  const store = new MemoryPipelineStore();
  return { createStore: () => store };
});

// The default market/competitor stores are real Supabase-backed as of
// Milestone 125 (previously in-memory) — a recovered/resumed execution's
// decision stage reaches them transitively through synthesizeDecision's
// own resolveMarketKnowledge/resolveCompetitorKnowledge calls. Same
// shape as the pipeline store mock above.
vi.mock("@/lib/market/storage/createStore", async () => {
  const { MemoryMarketStore } = await import("@/lib/market/storage/memoryStore");
  const store = new MemoryMarketStore();
  return { createStore: () => store };
});

vi.mock("@/lib/competitors/storage/createStore", async () => {
  const { MemoryCompetitorStore } = await import("@/lib/competitors/storage/memoryStore");
  const store = new MemoryCompetitorStore();
  return { createStore: () => store };
});

const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

afterEach(() => {
  runResearchMock.mockReset();
});

import type { ResearchResult } from "@/lib/research";
import { STALE_EXECUTION_THRESHOLD_MS } from "@/lib/pipeline";
import { createStore } from "@/lib/pipeline/storage/createStore";
import { getSession, cancelSession } from "@/lib/analysis-session/lifecycle/sessionLifecycle";
import { MemoryAnalysisSessionStore } from "@/lib/analysis-session/storage/memoryStore";
import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";

function buildResearchResult(overrides: Partial<ResearchResult> = {}): ResearchResult {
  return {
    request: { topic: "placeholder" },
    sources: [],
    evidence: [],
    providerResults: [],
    providerSummary: [],
    sourceSummary: { totalSources: 0, uniqueDomains: 0, averageConfidence: null, bySourceType: [] },
    searchStatistics: {
      providersQueried: 0,
      providersSucceeded: 0,
      providersFailed: 0,
      totalLatencyMs: 0,
      fallbackTriggered: false,
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildStuckExecution(overrides: Partial<PipelineExecution> = {}): PipelineExecution {
  return {
    id: "pipeline_stuck",
    startupIdea: "A subscription tool for team scheduling",
    state: "running",
    currentStageIndex: 2,
    context: { startupIdea: "A subscription tool for team scheduling" },
    stageHistory: [],
    progress: { completedStages: 2, percent: 33 },
    version: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 10_000).toISOString(),
    ...overrides,
  };
}

function buildSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session_stuck",
    executionId: "pipeline_stuck",
    title: "A subscription tool for team scheduling",
    startupIdea: "A subscription tool for team scheduling",
    ownerId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Milestone 108 — proves the actual, real integration point: getSession()
// is the one function every poll (GET /api/analysis-sessions/:id) passes
// through, and before this milestone it was a plain read with no
// staleness awareness at all (resumePipeline() existed but was never
// called from here or anywhere else in the live app).
describe("recovery via getSession (the real polling integration point)", () => {
  it("a stale, stuck session recovers and reaches completed on the next poll", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());
    const analysisStore = new MemoryAnalysisSessionStore();

    await createStore().upsert(buildStuckExecution({ id: "pipeline_a" }));
    await analysisStore.upsert(buildSessionRecord({ id: "session_a", executionId: "pipeline_a" }));

    const view = await getSession("session_a", null, analysisStore);

    expect(view?.state).toBe("completed");
  });

  it("a genuinely fresh, non-stale running session is left completely untouched", async () => {
    const analysisStore = new MemoryAnalysisSessionStore();
    const fresh = buildStuckExecution({ id: "pipeline_b", updatedAt: new Date().toISOString() });
    await createStore().upsert(fresh);
    await analysisStore.upsert(buildSessionRecord({ id: "session_b", executionId: "pipeline_b" }));

    const view = await getSession("session_b", null, analysisStore);

    // Still non-terminal (composeAnalysisSession's own vocabulary calls
    // the pipeline's "running" state "analyzing") — recovery was never
    // attempted, and runResearchMock (unconfigured in this test) was
    // never called.
    expect(view?.state).toBe("analyzing");
    expect(runResearchMock).not.toHaveBeenCalled();
  });

  it.each(["completed", "cancelled", "failed"] as const)(
    "never attempts recovery on a %s session, no matter how old",
    async (state) => {
      const analysisStore = new MemoryAnalysisSessionStore();
      const execution = buildStuckExecution({ id: `pipeline_${state}`, state });
      await createStore().upsert(execution);
      await analysisStore.upsert(buildSessionRecord({ id: `session_${state}`, executionId: `pipeline_${state}` }));

      const view = await getSession(`session_${state}`, null, analysisStore);

      expect(view?.state).toBe(state);
      expect(runResearchMock).not.toHaveBeenCalled();
    }
  );

  it("logs when a recovery attempt is made", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    runResearchMock.mockResolvedValue(buildResearchResult());
    const analysisStore = new MemoryAnalysisSessionStore();
    await createStore().upsert(buildStuckExecution({ id: "pipeline_c" }));
    await analysisStore.upsert(buildSessionRecord({ id: "session_c", executionId: "pipeline_c" }));

    await getSession("session_c", null, analysisStore);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[pipeline recovery]"));
    consoleSpy.mockRestore();
  });

  it("polling behaviour after recovery: a second poll immediately after the first stays stable at completed", async () => {
    runResearchMock.mockResolvedValue(buildResearchResult());
    const analysisStore = new MemoryAnalysisSessionStore();
    await createStore().upsert(buildStuckExecution({ id: "pipeline_d" }));
    await analysisStore.upsert(buildSessionRecord({ id: "session_d", executionId: "pipeline_d" }));

    const firstPoll = await getSession("session_d", null, analysisStore);
    const secondPoll = await getSession("session_d", null, analysisStore);

    expect(firstPoll?.state).toBe("completed");
    expect(secondPoll?.state).toBe("completed");
  });

  it("cancellation still works correctly on a session that was just recovered", async () => {
    // A stage that never resolves, so the recovered execution is
    // genuinely back in "running" (in flight) rather than racing straight
    // to completion — giving cancelSession something real to act on.
    runResearchMock.mockImplementation(() => new Promise(() => {}));
    const analysisStore = new MemoryAnalysisSessionStore();
    await createStore().upsert(buildStuckExecution({ id: "pipeline_e" }));
    await analysisStore.upsert(buildSessionRecord({ id: "session_e", executionId: "pipeline_e" }));

    // getSession() itself would hang (it awaits the full resumed run) —
    // fire it without awaiting, matching the outer-promise pattern
    // pipelineEngine.recovery.test.ts's own concurrent-attempt tests use.
    void getSession("session_e", null, analysisStore);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const cancelled = await cancelSession("session_e", null, analysisStore);

    expect(["cancelling", "cancelled"]).toContain(cancelled.state);
  });

  // Milestone 108 — the exact gap found via manual testing against the
  // live database: a stale execution stuck in "cancelling" (its own
  // driver disappeared mid-cancellation, so no stage boundary was ever
  // going to observe the cancellation and finalize it) must resolve to
  // "cancelled" on the next poll, not stay stuck forever.
  it("a stale, stuck-cancelling session is finalized to cancelled on the next poll", async () => {
    const analysisStore = new MemoryAnalysisSessionStore();
    await createStore().upsert(buildStuckExecution({ id: "pipeline_f", state: "cancelling" }));
    await analysisStore.upsert(buildSessionRecord({ id: "session_f", executionId: "pipeline_f" }));

    const view = await getSession("session_f", null, analysisStore);

    expect(view?.state).toBe("cancelled");
    expect(runResearchMock).not.toHaveBeenCalled();
  });
});
