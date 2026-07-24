import { describe, it, expect } from "vitest";
import { createStore, type PipelineStoreBackend } from "@/lib/pipeline/storage/createStore";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";

// Milestone 82, revised at Milestone 107: createSupabasePipelineStore is
// now a real factory function (was the throwing SupabasePipelineStore
// class) — verified structurally (the four-plus-one method shape) rather
// than by class identity, since a factory function's return value has no
// class to instanceof-check against.
describe("createStore", () => {
  it("defaults to a MemoryPipelineStore when no backend is specified", () => {
    expect(createStore()).toBeInstanceOf(MemoryPipelineStore);
  });

  it("returns a MemoryPipelineStore for backend: 'memory'", () => {
    expect(createStore({ backend: "memory" })).toBeInstanceOf(MemoryPipelineStore);
  });

  it("returns a real, non-memory PipelineExecutionStore for backend: 'supabase'", () => {
    const store = createStore({ backend: "supabase" });
    expect(store).not.toBeInstanceOf(MemoryPipelineStore);
    expect(store.getById).toBeTypeOf("function");
    expect(store.list).toBeTypeOf("function");
    expect(store.upsert).toBeTypeOf("function");
    expect(store.delete).toBeTypeOf("function");
    expect(store.upsertWithVersionCheck).toBeTypeOf("function");
  });

  it("throws for an unrecognized backend value", () => {
    const invalidBackend = "vector" as PipelineStoreBackend;
    expect(() => createStore({ backend: invalidBackend })).toThrow(
      "Unknown pipeline store backend: vector"
    );
  });
});
