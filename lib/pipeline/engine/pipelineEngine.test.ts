import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InvalidRequestError } from "@/lib/errors";
import type { ResearchResult } from "@/lib/research";
import type { PipelineExecution } from "@/lib/pipeline/schemas/execution.schema";
import { buildInitialExecution } from "@/lib/pipeline/engine/executionFactory";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
import { subscribeToExecution as eventEmitterSubscribe } from "@/lib/pipeline/events/eventEmitter";
import {
  startPipeline,
  resumePipeline,
  retryStage,
  cancelPipeline,
  getExecution,
  subscribeToExecution as pipelineEngineSubscribe,
} from "@/lib/pipeline/engine/pipelineEngine";

// Final lib/pipeline milestone — pipelineEngine.ts is the platform's own
// composition root. Every one of its real dependencies (all six stages,
// the state machine, checkpoint writer, event emitter, retry policy,
// progress calculator, execution factory, and store) is already tested
// elsewhere in this series. Its own single true external boundary is
// runResearch, reached transitively through every stage — mocking only
// that lets the real orchestration logic (retry-with-backoff, cooperative
// cancellation, the shared start/resume/retry core) run for real, against
// a real MemoryPipelineStore instance constructed fresh per test rather
// than the module's own shared defaultStore singleton, to avoid cross-test
// state pollution.
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

describe("startPipeline", () => {
  it("throws for invalid input before any execution is ever persisted", async () => {
    const store = new MemoryPipelineStore();

    await expect(startPipeline({ startupIdea: "" }, store)).rejects.toThrow();

    expect(await store.list()).toEqual([]);
  });

  it("drives a fresh execution through every stage to completion", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const result = await startPipeline({ startupIdea: "A subscription scheduling tool" }, store);

    expect(result.state).toBe("completed");
    expect(result.currentStageIndex).toBe(6);
    expect(result.progress.percent).toBe(100);
    expect(result.stageHistory.filter((record) => record.status === "succeeded")).toHaveLength(6);
    expect(result.context.research).toBeDefined();
    expect(result.context.competitors).toBeDefined();
    expect(result.context.market).toBeDefined();
    expect(result.context.financial).toBeDefined();
    expect(result.context.business).toBeDefined();
    expect(result.context.decision).toBeDefined();
  });
});

describe("resumePipeline", () => {
  it("throws InvalidRequestError when no execution exists for the given id", async () => {
    const store = new MemoryPipelineStore();

    await expect(resumePipeline("missing_id", store)).rejects.toThrow(InvalidRequestError);
  });

  it("returns a terminal execution unchanged, without re-driving it", async () => {
    const store = new MemoryPipelineStore();
    const seeded: PipelineExecution = {
      ...buildInitialExecution("An idea"),
      state: "completed",
      currentStageIndex: 6,
    };
    await store.upsert(seeded);

    const result = await resumePipeline(seeded.id, store);

    expect(result.state).toBe("completed");
    expect(runResearchMock).not.toHaveBeenCalled();
  });

  it.each(["stage_failed", "retry_pending", "cancelling"] as const)(
    "returns a %s execution unchanged, without re-driving it",
    async (state) => {
      const store = new MemoryPipelineStore();
      const seeded: PipelineExecution = { ...buildInitialExecution("An idea"), state };
      await store.upsert(seeded);

      const result = await resumePipeline(seeded.id, store);

      expect(result.state).toBe(state);
      expect(runResearchMock).not.toHaveBeenCalled();
    }
  );

  it("resumes from the persisted currentStageIndex, marking only the first re-driven stage as 'resumed'", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const seeded: PipelineExecution = {
      ...buildInitialExecution("An idea"),
      state: "running",
      currentStageIndex: 2,
      stageHistory: [
        { stage: "research", attempt: 1, trigger: "initial", status: "succeeded", startedAt: "2026-01-01T00:00:00.000Z" },
        { stage: "competitors", attempt: 1, trigger: "initial", status: "succeeded", startedAt: "2026-01-01T00:00:01.000Z" },
      ],
    };
    await store.upsert(seeded);

    const result = await resumePipeline(seeded.id, store);

    expect(result.state).toBe("completed");
    expect(result.stageHistory.filter((record) => record.stage === "research")).toHaveLength(1);
    expect(result.stageHistory.filter((record) => record.stage === "competitors")).toHaveLength(1);
    const marketRecord = result.stageHistory.find((record) => record.stage === "market");
    expect(marketRecord?.trigger).toBe("resumed");
    const financialRecord = result.stageHistory.find((record) => record.stage === "financial");
    expect(financialRecord?.trigger).toBe("initial");
  });
});

describe("retryStage", () => {
  it("throws InvalidRequestError when no execution exists for the given id", async () => {
    const store = new MemoryPipelineStore();

    await expect(retryStage("missing_id", store)).rejects.toThrow(InvalidRequestError);
  });

  it("throws InvalidRequestError when the execution is not in stage_failed", async () => {
    const store = new MemoryPipelineStore();
    const seeded: PipelineExecution = { ...buildInitialExecution("An idea"), state: "running" };
    await store.upsert(seeded);

    await expect(retryStage(seeded.id, store)).rejects.toThrow(InvalidRequestError);
  });

  it("re-runs only the failed stage, marking it 'manual_retry', without re-running earlier succeeded stages", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockResolvedValue(buildResearchResult({ sources: [] }));

    const seeded: PipelineExecution = {
      ...buildInitialExecution("An idea"),
      state: "stage_failed",
      currentStageIndex: 1,
      errorSummary: "boom",
      stageHistory: [
        { stage: "research", attempt: 1, trigger: "initial", status: "succeeded", startedAt: "2026-01-01T00:00:00.000Z" },
        {
          stage: "competitors",
          attempt: 1,
          trigger: "initial",
          status: "failed",
          startedAt: "2026-01-01T00:00:01.000Z",
          errorMessage: "boom",
        },
      ],
    };
    await store.upsert(seeded);

    const result = await retryStage(seeded.id, store);

    expect(result.state).toBe("completed");
    expect(result.stageHistory.filter((record) => record.stage === "research")).toHaveLength(1);
    const competitorsRecords = result.stageHistory.filter((record) => record.stage === "competitors");
    expect(competitorsRecords).toHaveLength(2);
    expect(competitorsRecords[1].status).toBe("succeeded");
    expect(competitorsRecords[1].trigger).toBe("manual_retry");
  });
});

describe("cancelPipeline", () => {
  it("throws InvalidRequestError when no execution exists for the given id", async () => {
    const store = new MemoryPipelineStore();

    await expect(cancelPipeline("missing_id", store)).rejects.toThrow(InvalidRequestError);
  });

  it("returns a terminal execution unchanged", async () => {
    const store = new MemoryPipelineStore();
    const seeded: PipelineExecution = {
      ...buildInitialExecution("An idea"),
      state: "completed",
      currentStageIndex: 6,
    };
    await store.upsert(seeded);

    const result = await cancelPipeline(seeded.id, store);

    expect(result.state).toBe("completed");
  });

  it.each(["stage_failed", "retry_pending"] as const)(
    "cancels immediately from %s, where no stage is in flight",
    async (state) => {
      const store = new MemoryPipelineStore();
      const seeded: PipelineExecution = { ...buildInitialExecution("An idea"), state };
      await store.upsert(seeded);

      const result = await cancelPipeline(seeded.id, store);

      expect(result.state).toBe("cancelled");
    }
  );

  it("marks 'cancelling', not 'cancelled', when a stage is genuinely in flight", async () => {
    const store = new MemoryPipelineStore();
    const seeded: PipelineExecution = { ...buildInitialExecution("An idea"), state: "running" };
    await store.upsert(seeded);

    const result = await cancelPipeline(seeded.id, store);

    expect(result.state).toBe("cancelling");
  });
});

describe("getExecution", () => {
  it("returns the persisted execution for a known id", async () => {
    const store = new MemoryPipelineStore();
    const seeded = buildInitialExecution("An idea");
    await store.upsert(seeded);

    const result = await getExecution(seeded.id, store);

    expect(result).toEqual(seeded);
  });

  it("returns null for an unknown id", async () => {
    const store = new MemoryPipelineStore();

    const result = await getExecution("missing_id", store);

    expect(result).toBeNull();
  });
});

describe("subscribeToExecution", () => {
  it("re-exports the same function eventEmitter.ts defines, adding no logic of its own", () => {
    expect(pipelineEngineSubscribe).toBe(eventEmitterSubscribe);
  });
});

describe("cooperative cancellation", () => {
  it("stops at the next stage boundary and transitions to cancelled when a concurrent cancelPipeline call lands mid-run", async () => {
    const store = new MemoryPipelineStore();

    // Simulates a concurrent cancelPipeline() call landing while the
    // research stage's own runResearch call is still in flight. The
    // engine's runFromCurrentStage loop only observes this at its next
    // stage-boundary check, before starting the competitors stage — never
    // mid-stage.
    runResearchMock.mockImplementation(async () => {
      const [execution] = await store.list();
      if (execution) {
        await cancelPipeline(execution.id, store);
      }
      return buildResearchResult({ sources: [] });
    });

    const result = await startPipeline({ startupIdea: "An idea" }, store);

    expect(result.state).toBe("cancelled");
    expect(runResearchMock).toHaveBeenCalledTimes(1);
    expect(result.stageHistory.filter((record) => record.stage === "research")).toHaveLength(1);
    expect(result.stageHistory.some((record) => record.stage === "competitors")).toBe(false);
  });
});

describe("automatic retry with backoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a failed stage automatically and completes once it succeeds", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock
      .mockRejectedValueOnce(new Error("transient failure"))
      .mockResolvedValue(buildResearchResult({ sources: [] }));

    const resultPromise = startPipeline({ startupIdea: "An idea" }, store);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result.state).toBe("completed");
    const researchRecords = result.stageHistory.filter((record) => record.stage === "research");
    expect(researchRecords).toHaveLength(2);
    expect(researchRecords[0].status).toBe("failed");
    expect(researchRecords[0].trigger).toBe("initial");
    expect(researchRecords[1].status).toBe("succeeded");
    expect(researchRecords[1].trigger).toBe("auto_retry");
  });

  it("transitions to stage_failed after exhausting maxAutoRetries", async () => {
    const store = new MemoryPipelineStore();
    runResearchMock.mockRejectedValue(new Error("persistent failure"));

    const resultPromise = startPipeline({ startupIdea: "An idea" }, store);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await resultPromise;

    expect(result.state).toBe("stage_failed");
    expect(result.errorSummary).toBe("persistent failure");
    const researchRecords = result.stageHistory.filter((record) => record.stage === "research");
    expect(researchRecords).toHaveLength(3);
    expect(researchRecords.every((record) => record.status === "failed")).toBe(true);
  });
});
