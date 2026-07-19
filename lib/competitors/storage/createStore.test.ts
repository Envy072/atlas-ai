import { describe, it, expect } from "vitest";
import { createStore, type CompetitorStoreBackend } from "@/lib/competitors/storage/createStore";
import { MemoryCompetitorStore } from "@/lib/competitors/storage/memoryStore";
import { SupabaseCompetitorStore } from "@/lib/competitors/storage/supabaseStore";
import { VectorDbCompetitorStore } from "@/lib/competitors/storage/vectorStore";

// Milestone 54 — verifies this file's actual, current dispatch behavior:
// defaults to memory, returns the correct class per named backend, and
// throws on an unrecognized backend value (the exhaustive-check branch,
// only reachable by bypassing the type system, as a real caller might via
// a deserialized config value).
describe("createStore", () => {
  it("defaults to a MemoryCompetitorStore when no backend is specified", () => {
    expect(createStore()).toBeInstanceOf(MemoryCompetitorStore);
  });

  it("returns a MemoryCompetitorStore for backend: 'memory'", () => {
    expect(createStore({ backend: "memory" })).toBeInstanceOf(MemoryCompetitorStore);
  });

  it("returns a SupabaseCompetitorStore for backend: 'supabase'", () => {
    expect(createStore({ backend: "supabase" })).toBeInstanceOf(SupabaseCompetitorStore);
  });

  it("returns a VectorDbCompetitorStore for backend: 'vector'", () => {
    expect(createStore({ backend: "vector" })).toBeInstanceOf(VectorDbCompetitorStore);
  });

  it("throws for an unrecognized backend value", () => {
    const invalidBackend = "postgres" as CompetitorStoreBackend;
    expect(() => createStore({ backend: invalidBackend })).toThrow(
      "Unknown competitor store backend: postgres"
    );
  });
});
