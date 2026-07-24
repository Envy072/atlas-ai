import { describe, it, expect, vi, afterEach } from "vitest";
import type { ResearchResult } from "@/lib/research";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import type { PipelineExecutionStore, UpsertVersionCheckResult } from "@/lib/pipeline/types/storage";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
import { ConcurrencyConflictError } from "@/lib/errors";
import { startPipeline, cancelPipeline } from "@/lib/pipeline/engine/pipelineEngine";

// Milestone 107's own dedicated concurrency coverage — separate from
// pipelineEngine.test.ts's general orchestration suite, since these
// tests exist specifically to prove the approved concurrency design
// (Milestone 104A ADR / Milestone 107's own design document): the
// cooperative-cancellation race Milestone 104C's Finding 1 identified,
// and the optimistic-concurrency mechanism that closes it.
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

// Wraps a real MemoryPipelineStore, letting a test inject an out-of-band
// write immediately before a specific upsertWithVersionCheck call
// commits — the deterministic way to force the exact race Milestone
// 104C identified (a concurrent write landing in the gap between a
// caller's own read and its write) without relying on real timing.
class RacingPipelineStore implements PipelineExecutionStore {
  private injectBeforeNextWrite: (() => Promise<void>) | null = null;
  private writeCount = 0;
  public readonly writeVersionsAttempted: number[] = [];

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
    this.writeCount += 1;
    this.writeVersionsAttempted.push(expectedVersion);

    if (this.injectBeforeNextWrite) {
      const inject = this.injectBeforeNextWrite;
      this.injectBeforeNextWrite = null;
      await inject();
    }

    return this.inner.upsertWithVersionCheck(execution, expectedVersion);
  }
}

// A store whose every version-checked write reports a conflict against a
// fixed, unchanging "current" row — used to force cancelPipeline()'s own
// bounded retry to exhaust deterministically, without needing a real
// concurrent writer at all.
class AlwaysConflictingStore implements PipelineExecutionStore {
  constructor(private readonly current: PipelineExecution) {}

  async getById() {
    return this.current;
  }

  async list() {
    return [this.current];
  }

  async upsert() {}

  async delete() {}

  async upsertWithVersionCheck(): Promise<UpsertVersionCheckResult> {
    return { success: false, current: this.current };
  }
}

describe("successful cancellation", () => {
  it("cancels a stage_failed execution immediately, incrementing its version", async () => {
    const inner = new MemoryPipelineStore();
    runResearchMock.mockRejectedValue(new Error("persistent failure"));
    vi.useFakeTimers();
    const resultPromise = startPipeline({ startupIdea: "An idea" }, inner);
    await vi.advanceTimersByTimeAsync(5000);
    const failed = await resultPromise;
    vi.useRealTimers();
    expect(failed.state).toBe("stage_failed");

    const cancelled = await cancelPipeline(failed.id, inner);

    expect(cancelled.state).toBe("cancelled");
    expect(cancelled.version).toBe(failed.version + 1);
  });

  it("marks a running execution as cancelling, not cancelled directly", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockImplementation(async () => {
      const [execution] = await store.list();
      const result = await cancelPipeline(execution.id, store);
      expect(result.state).toBe("cancelling");
      return buildResearchResult();
    });

    await startPipeline({ startupIdea: "An idea" }, store);
  });
});

describe("cancellation during checkpoint (Milestone 104C Finding 1)", () => {
  it("a stage's own successful checkpoint yields to a cancellation that committed first, preserving the stage's own history", async () => {
    const inner = new MemoryPipelineStore();
    const racing = new RacingPipelineStore(inner);

    runResearchMock.mockImplementation(async () => {
      // Inject the concurrent cancellation immediately before the
      // research stage's own success checkpoint attempts to commit —
      // the exact gap Milestone 104C's Finding 1 identified.
      racing.injectOnce(async () => {
        const [execution] = await inner.list();
        await cancelPipeline(execution.id, racing);
      });
      return buildResearchResult({ sources: [] });
    });

    const result = await startPipeline({ startupIdea: "An idea" }, racing);

    expect(result.state).toBe("cancelled");
    // The bug this test guards against: an earlier implementation
    // discarded the stage's own successful result when reconciling,
    // resolving the conflict against the fresh (pre-completion) row
    // instead of merging it with the caller's own in-memory update.
    expect(result.stageHistory.filter((r) => r.stage === "research")).toHaveLength(1);
    expect(result.stageHistory.some((r) => r.status === "succeeded")).toBe(true);
  });
});

describe("cancellation during retry backoff", () => {
  it("a cancellation landing during the automatic-retry backoff sleep is observed once the wait ends", async () => {
    const store = new MemoryPipelineStore();
    vi.useFakeTimers();
    runResearchMock.mockRejectedValueOnce(new Error("transient failure")).mockResolvedValue(buildResearchResult());

    const resultPromise = startPipeline({ startupIdea: "An idea" }, store);
    // Let the first failure's own checkpoint (transition to
    // retry_pending) land before cancelling mid-backoff.
    await vi.advanceTimersByTimeAsync(50);
    const [execution] = await store.list();
    await cancelPipeline(execution.id, store);
    await vi.advanceTimersByTimeAsync(5000);

    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.state).toBe("cancelled");
  });
});

describe("retry and reconciliation", () => {
  it("cancelPipeline retries against the fresh version when it loses a race, still reaching cancelling", async () => {
    const inner = new MemoryPipelineStore();
    const racing = new RacingPipelineStore(inner);

    runResearchMock.mockImplementation(async () => {
      // Never resolves within this test's timeframe — the stage stays
      // "in flight" so the execution is genuinely "running" when
      // cancelPipeline is called against it below.
      return new Promise(() => {});
    });

    // Deliberately never awaited — it never resolves within this test,
    // since runResearchMock's own promise above never settles either.
    void startPipeline({ startupIdea: "An idea" }, inner);
    await vi.waitFor(async () => {
      const [execution] = await inner.list();
      expect(execution?.state).toBe("running");
    });

    const [execution] = await inner.list();

    // Force cancelPipeline's own first write attempt to lose a race: an
    // unrelated write (bumping updatedAt only) commits first via the
    // racing store, so cancelPipeline's own conditional write against
    // the version it originally read fails once, then must retry.
    racing.injectOnce(async () => {
      const latest = await inner.getById(execution.id);
      if (latest) {
        await inner.upsertWithVersionCheck({ ...latest, updatedAt: new Date().toISOString() }, latest.version);
      }
    });

    const result = await cancelPipeline(execution.id, racing);

    expect(result.state).toBe("cancelling");
    expect(racing.writeVersionsAttempted.length).toBeGreaterThan(1);
  });
});

describe("retry exhaustion", () => {
  it("throws ConcurrencyConflictError when every conflict-retry attempt keeps losing", async () => {
    const current: PipelineExecution = {
      id: "pipeline_stuck",
      startupIdea: "An idea",
      state: "running",
      currentStageIndex: 0,
      context: { startupIdea: "An idea" },
      stageHistory: [],
      progress: { completedStages: 0, percent: 0 },
      version: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const store = new AlwaysConflictingStore(current);

    await expect(cancelPipeline("pipeline_stuck", store)).rejects.toThrow(ConcurrencyConflictError);
  });
});

describe("multi-instance simulation", () => {
  it("two independent store handles to the same underlying data never both succeed for the same version", async () => {
    const shared = new MemoryPipelineStore();
    const instanceA = new RacingPipelineStore(shared);
    const instanceB = new RacingPipelineStore(shared);

    const execution: PipelineExecution = {
      id: "pipeline_shared",
      startupIdea: "An idea",
      state: "running",
      currentStageIndex: 0,
      context: { startupIdea: "An idea" },
      stageHistory: [],
      progress: { completedStages: 0, percent: 0 },
      version: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await shared.upsertWithVersionCheck(execution, 0);

    const [resultA, resultB] = await Promise.all([
      instanceA.upsertWithVersionCheck({ ...execution, state: "cancelling", version: 1 }, 1),
      instanceB.upsertWithVersionCheck({ ...execution, state: "stage_failed", version: 1 }, 1),
    ]);

    // Exactly one of the two concurrent "instances" wins — never both,
    // and never neither.
    const successes = [resultA, resultB].filter((r) => r.success);
    expect(successes).toHaveLength(1);

    const final = await shared.getById("pipeline_shared");
    expect(final?.version).toBe(2);
    expect(["cancelling", "stage_failed"]).toContain(final?.state);
  });
});
