import { describe, it, expect, vi } from "vitest";
import { subscribeToExecution, emitPipelineEvent } from "@/lib/pipeline/events/eventEmitter";
import type { PipelineEvent } from "@/lib/pipeline/schemas/event.schema";

function buildEvent(overrides: Partial<PipelineEvent> = {}): PipelineEvent {
  return {
    type: "pipeline.started",
    executionId: "pipeline_1",
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// Milestone 77 — verifies this file's actual, current in-process pub/sub
// behavior: delivery scoped by executionId, multiple listeners per
// executionId, unsubscribe removing exactly one listener, and the
// Map-cleanup that occurs once an executionId's last listener
// unsubscribes.
describe("subscribeToExecution / emitPipelineEvent", () => {
  it("delivers an emitted event to a listener subscribed to the same executionId", () => {
    const listener = vi.fn();
    subscribeToExecution("pipeline_1", listener);

    const event = buildEvent({ executionId: "pipeline_1" });
    emitPipelineEvent(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it("delivers the same event to every listener subscribed to that executionId", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    subscribeToExecution("pipeline_2", listenerA);
    subscribeToExecution("pipeline_2", listenerB);

    const event = buildEvent({ executionId: "pipeline_2" });
    emitPipelineEvent(event);

    expect(listenerA).toHaveBeenCalledWith(event);
    expect(listenerB).toHaveBeenCalledWith(event);
  });

  it("does not deliver an event to a listener subscribed to a different executionId", () => {
    const listener = vi.fn();
    subscribeToExecution("pipeline_3", listener);

    emitPipelineEvent(buildEvent({ executionId: "some_other_execution" }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not throw when emitting to an executionId with no subscribers", () => {
    expect(() => emitPipelineEvent(buildEvent({ executionId: "no_subscribers_here" }))).not.toThrow();
  });

  it("stops delivering to a listener after it unsubscribes, without affecting other listeners", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const unsubscribeA = subscribeToExecution("pipeline_4", listenerA);
    subscribeToExecution("pipeline_4", listenerB);

    unsubscribeA();
    emitPipelineEvent(buildEvent({ executionId: "pipeline_4" }));

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it("stops delivering entirely once the last listener for an executionId unsubscribes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToExecution("pipeline_5", listener);

    unsubscribe();
    emitPipelineEvent(buildEvent({ executionId: "pipeline_5" }));

    expect(listener).not.toHaveBeenCalled();
  });
});
