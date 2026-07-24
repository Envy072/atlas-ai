import { describe, it, expect, vi, afterEach } from "vitest";
import type { ResearchResult } from "@/lib/research";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore, UpsertVersionCheckResult } from "@/lib/pipeline/types/storage";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
import {
  resumePipeline,
  isExecutionStale,
  finalizeStaleCancellation,
  STALE_EXECUTION_THRESHOLD_MS,
} from "@/lib/pipeline/engine/pipelineEngine";

// Milestone 108's own dedicated recovery coverage — separate from
// pipelineEngine.test.ts's general orchestration suite and
// pipelineEngine.concurrency.test.ts's cancellation-race suite, since
// these tests exist specifically to prove: a stuck execution recovers
// once genuinely stale, an actively-progressing one is never touched,
// and concurrent recovery attempts suppress cleanly rather than error
// (Milestone 108's Phase 2 design refinement).
const { runResearchMock } = vi.hoisted(() => ({ runResearchMock: vi.fn() }));

vi.mock("@/lib/research", async () => {
  const actual = await vi.importActual<typeof import("@/lib/research")>("@/lib/research");
  return { ...actual, runResearch: runResearchMock };
});

afterEach(() => {
  runResearchMock.mockReset();
});

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

function buildExecution(overrides: Partial<PipelineExecution> = {}): PipelineExecution {
  return {
    id: "pipeline_1",
    startupIdea: "A subscription software platform for team scheduling",
    state: "running",
    currentStageIndex: 2,
    context: { startupIdea: "A subscription software platform for team scheduling" },
    stageHistory: [],
    progress: { completedStages: 2, percent: 33 },
    version: 4,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// A store handle that lets a test inject an out-of-band write
// immediately before its own upsertWithVersionCheck call commits — the
// deterministic way to simulate two concurrent recovery attempts racing
// the same execution, mirroring pipelineEngine.concurrency.test.ts's own
// RacingPipelineStore.
class RacingPipelineStore implements PipelineExecutionStore {
  private injectBeforeNextWrite: (() => Promise<void>) | null = null;

  constructor(private readonly inner: PipelineExecutionStore) {}

  injectOnce(action: () => Promise<void>): void {
    this.injectBeforeNextWrite = action;
  }

  getById(id: string) {
    return this.inner.getById(id);
  }

  list() {
    return this.inner.list();
  }

  upsert(execution: PipelineExecution) {
    return this.inner.upsert(execution);
  }

  delete(id: string) {
    return this.inner.delete(id);
  }

  async upsertWithVersionCheck(execution: PipelineExecution, expectedVersion: number): Promise<UpsertVersionCheckResult> {
    if (this.injectBeforeNextWrite) {
      const inject = this.injectBeforeNextWrite;
      this.injectBeforeNextWrite = null;
      await inject();
    }
    return this.inner.upsertWithVersionCheck(execution, expectedVersion);
  }
}

describe("isExecutionStale", () => {
  const now = new Date("2026-01-01T00:10:00.000Z"); // 10 minutes after createdAt/updatedAt

  it("is stale for a running execution whose updatedAt is older than the threshold", () => {
    const execution = buildExecution({ state: "running", updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(isExecutionStale(execution, now)).toBe(true);
  });

  it("is stale for a pending execution whose updatedAt is older than the threshold", () => {
    const execution = buildExecution({ state: "pending", updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(isExecutionStale(execution, now)).toBe(true);
  });

  it("is not stale when updatedAt is within the threshold", () => {
    const recent = new Date(now.getTime() - (STALE_EXECUTION_THRESHOLD_MS - 1000));
    const execution = buildExecution({ state: "running", updatedAt: recent.toISOString() });
    expect(isExecutionStale(execution, now)).toBe(false);
  });

  it.each(["completed", "cancelled", "failed"] as const)(
    "is never stale for a terminal state (%s), regardless of age",
    (state) => {
      const execution = buildExecution({ state, updatedAt: "2026-01-01T00:00:00.000Z" });
      expect(isExecutionStale(execution, now)).toBe(false);
    }
  );

  it.each(["retry_pending", "stage_failed"] as const)(
    "is never stale for %s, even if old — resumePipeline() itself doesn't act on these",
    (state) => {
      const execution = buildExecution({ state, updatedAt: "2026-01-01T00:00:00.000Z" });
      expect(isExecutionStale(execution, now)).toBe(false);
    }
  );

  it("is stale for a cancelling execution whose updatedAt is old — no live process left to finalize it", () => {
    const execution = buildExecution({ state: "cancelling", updatedAt: "2026-01-01T00:00:00.000Z" });
    expect(isExecutionStale(execution, now)).toBe(true);
  });
});

describe("restart recovery", () => {
  it("a stale, stuck execution resumes from its currentStageIndex and reaches completed", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockResolvedValue(buildResearchResult());

    // Simulate a process that started an execution, got as far as
    // "running" with two stages already recorded, then disappeared —
    // its updatedAt is old enough to be genuinely stale.
    const staleExecution = buildExecution({
      state: "running",
      currentStageIndex: 2,
      updatedAt: new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 5000).toISOString(),
    });
    await store.upsert(staleExecution);

    const result = await resumePipeline(staleExecution.id, store);

    expect(result.state).toBe("completed");
  });
});

describe("non-stale execution", () => {
  it("resumePipeline still works correctly on a genuinely fresh running execution (unchanged behavior)", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockResolvedValue(buildResearchResult());

    const freshExecution = buildExecution({ state: "running", currentStageIndex: 2, updatedAt: new Date().toISOString() });
    await store.upsert(freshExecution);

    // isExecutionStale correctly reports this one as NOT stale — the
    // caller-side gate (sessionLifecycle.ts's getSession()) would never
    // have called resumePipeline() here at all in the real flow.
    expect(isExecutionStale(freshExecution)).toBe(false);
  });
});

describe("completed/cancelled/failed execution", () => {
  it.each(["completed", "cancelled", "failed"] as const)(
    "never treats a %s execution as recoverable, regardless of how old it is",
    (state) => {
      const execution = buildExecution({ state, updatedAt: "2020-01-01T00:00:00.000Z" });
      expect(isExecutionStale(execution)).toBe(false);
    }
  );

  it("resumePipeline returns a terminal execution as-is even when manually invoked", async () => {
    const store = new MemoryPipelineStore();
    const completed = buildExecution({ state: "completed" });
    await store.upsert(completed);

    const result = await resumePipeline(completed.id, store);
    expect(result).toEqual(completed);
  });
});

// resumePipeline() awaits the ENTIRE runFromCurrentStage() chain, not
// just its own initial "mark running" write — with research hung
// forever, its promise never resolves. Both tests below only need to
// prove the *recovery write itself* (the part that can race a second
// attempt) never throws and converges correctly; they deliberately never
// await resumePipeline()'s own returned promise to completion.
describe("concurrent recovery attempts / duplicate recovery suppression", () => {
  it("two simultaneous resumePipeline calls against the same stale execution: neither throws, and the store converges to a single, consistent 'running' row", async () => {
    const inner = new MemoryPipelineStore();
    const racing = new RacingPipelineStore(inner);

    // Never resolves within this test — keeps each resume's own driven
    // stage genuinely in flight so its outer promise never settles;
    // only the early "mark running" write (the part under test) matters.
    runResearchMock.mockImplementation(() => new Promise(() => {}));

    const staleExecution = buildExecution({
      state: "running",
      currentStageIndex: 2,
      updatedAt: new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 5000).toISOString(),
    });
    await inner.upsert(staleExecution);

    // Force whichever resume attempt's own conditional write happens
    // first to lose the race to an out-of-band write simulating the
    // other attempt beating it to "running".
    racing.injectOnce(async () => {
      await inner.upsertWithVersionCheck(
        { ...staleExecution, state: "running", updatedAt: new Date().toISOString() },
        staleExecution.version
      );
    });

    let firstRejected = false;
    let secondRejected = false;
    void resumePipeline(staleExecution.id, racing).catch(() => {
      firstRejected = true;
    });
    void resumePipeline(staleExecution.id, racing).catch(() => {
      secondRejected = true;
    });

    // Give both calls' own initial write attempts time to settle (their
    // outer promises stay pending forever, by design, since research
    // never resolves).
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(firstRejected).toBe(false);
    expect(secondRejected).toBe(false);

    const final = await inner.getById(staleExecution.id);
    expect(final?.state).toBe("running");
    // Exactly one real write happened (the injected one) — both
    // resumePipeline attempts reconciled against it rather than each
    // writing their own competing version.
    expect(final?.version).toBe(staleExecution.version + 1);
  });
});

describe("optimistic concurrency during recovery", () => {
  it("a resume attempt that loses the version race returns the winner's row instead of throwing", async () => {
    const inner = new MemoryPipelineStore();
    const racing = new RacingPipelineStore(inner);

    const staleExecution = buildExecution({
      state: "running",
      updatedAt: new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 5000).toISOString(),
    });
    await inner.upsert(staleExecution);

    runResearchMock.mockImplementation(() => new Promise(() => {}));

    racing.injectOnce(async () => {
      await inner.upsertWithVersionCheck(
        { ...staleExecution, state: "running", updatedAt: new Date().toISOString() },
        staleExecution.version
      );
    });

    let rejected = false;
    void resumePipeline(staleExecution.id, racing).catch(() => {
      rejected = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(rejected).toBe(false);
    const final = await inner.getById(staleExecution.id);
    expect(final?.state).toBe("running");
  });
});

// A real gap discovered during this milestone's own manual validation
// against the live database, not anticipated during design: a stale
// "cancelling" execution has no live process left to ever finalize it —
// resumePipeline() itself correctly, deliberately declines to touch
// "cancelling" (trusting some other, already-running driver to notice
// it), an assumption that breaks precisely when that driver is the one
// that disappeared.
describe("finalizeStaleCancellation", () => {
  it("finalizes a stuck cancelling execution to cancelled", async () => {
    const store = new MemoryPipelineStore();
    const stuckCancelling = buildExecution({
      state: "cancelling",
      updatedAt: new Date(Date.now() - STALE_EXECUTION_THRESHOLD_MS - 5000).toISOString(),
    });
    await store.upsert(stuckCancelling);

    const result = await finalizeStaleCancellation(stuckCancelling.id, store);

    expect(result.state).toBe("cancelled");
    expect(result.version).toBe(stuckCancelling.version + 1);
  });

  it("leaves a non-cancelling execution untouched", async () => {
    const store = new MemoryPipelineStore();
    const running = buildExecution({ state: "running" });
    await store.upsert(running);

    const result = await finalizeStaleCancellation(running.id, store);

    expect(result).toEqual(running);
  });

  it("returns a terminal execution as-is", async () => {
    const store = new MemoryPipelineStore();
    const completed = buildExecution({ state: "completed" });
    await store.upsert(completed);

    const result = await finalizeStaleCancellation(completed.id, store);

    expect(result).toEqual(completed);
  });

  it("throws for an unknown execution id", async () => {
    const store = new MemoryPipelineStore();
    await expect(finalizeStaleCancellation("does-not-exist", store)).rejects.toThrow(
      'No pipeline execution found for id "does-not-exist".'
    );
  });
});
