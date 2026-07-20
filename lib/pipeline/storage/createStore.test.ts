import { describe, it, expect } from "vitest";
import { createStore, type PipelineStoreBackend } from "@/lib/pipeline/storage/createStore";
import { MemoryPipelineStore } from "@/lib/pipeline/storage/memoryStore";
import { SupabasePipelineStore } from "@/lib/pipeline/storage/supabaseStore";

// Milestone 82 — verifies this file's actual, current dispatch behavior.
// This platform has only two backends (memory, supabase), same as every
// knowledge platform's own createStore.ts.
describe("createStore", () => {
  it("defaults to a MemoryPipelineStore when no backend is specified", () => {
    expect(createStore()).toBeInstanceOf(MemoryPipelineStore);
  });

  it("returns a MemoryPipelineStore for backend: 'memory'", () => {
    expect(createStore({ backend: "memory" })).toBeInstanceOf(MemoryPipelineStore);
  });

  it("returns a SupabasePipelineStore for backend: 'supabase'", () => {
    expect(createStore({ backend: "supabase" })).toBeInstanceOf(SupabasePipelineStore);
  });

  it("throws for an unrecognized backend value", () => {
    const invalidBackend = "vector" as PipelineStoreBackend;
    expect(() => createStore({ backend: invalidBackend })).toThrow(
      "Unknown pipeline store backend: vector"
    );
  });
});
