import { describe, it, expect } from "vitest";
import { createStore, type FinancialStoreBackend } from "@/lib/financial/storage/createStore";
import { MemoryFinancialStore } from "@/lib/financial/storage/memoryStore";
import { SupabaseFinancialStore } from "@/lib/financial/storage/supabaseStore";

// Milestone 59 — verifies this file's actual, current dispatch behavior.
// This platform has only two backends (memory, supabase), same as
// lib/business.
describe("createStore", () => {
  it("defaults to a MemoryFinancialStore when no backend is specified", () => {
    expect(createStore()).toBeInstanceOf(MemoryFinancialStore);
  });

  it("returns a MemoryFinancialStore for backend: 'memory'", () => {
    expect(createStore({ backend: "memory" })).toBeInstanceOf(MemoryFinancialStore);
  });

  it("returns a SupabaseFinancialStore for backend: 'supabase'", () => {
    expect(createStore({ backend: "supabase" })).toBeInstanceOf(SupabaseFinancialStore);
  });

  it("throws for an unrecognized backend value", () => {
    const invalidBackend = "vector" as FinancialStoreBackend;
    expect(() => createStore({ backend: invalidBackend })).toThrow(
      "Unknown financial store backend: vector"
    );
  });
});
