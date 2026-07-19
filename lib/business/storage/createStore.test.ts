import { describe, it, expect } from "vitest";
import { createStore, type BusinessStoreBackend } from "@/lib/business/storage/createStore";
import { MemoryBusinessStore } from "@/lib/business/storage/memoryStore";
import { SupabaseBusinessStore } from "@/lib/business/storage/supabaseStore";

// Milestone 56 — verifies this file's actual, current dispatch behavior.
// This platform has only two backends (memory, supabase) — no "vector"
// variant like lib/competitors, since a semantic-similarity search has no
// obvious analog for a single business profile.
describe("createStore", () => {
  it("defaults to a MemoryBusinessStore when no backend is specified", () => {
    expect(createStore()).toBeInstanceOf(MemoryBusinessStore);
  });

  it("returns a MemoryBusinessStore for backend: 'memory'", () => {
    expect(createStore({ backend: "memory" })).toBeInstanceOf(MemoryBusinessStore);
  });

  it("returns a SupabaseBusinessStore for backend: 'supabase'", () => {
    expect(createStore({ backend: "supabase" })).toBeInstanceOf(SupabaseBusinessStore);
  });

  it("throws for an unrecognized backend value", () => {
    const invalidBackend = "vector" as BusinessStoreBackend;
    expect(() => createStore({ backend: invalidBackend })).toThrow(
      "Unknown business store backend: vector"
    );
  });
});
