import { describe, it, expect } from "vitest";
import { createStore, type MarketStoreBackend } from "@/lib/market/storage/createStore";
import { MemoryMarketStore } from "@/lib/market/storage/memoryStore";
import { SupabaseMarketStore } from "@/lib/market/storage/supabaseStore";

// Milestone 66 — verifies this file's actual, current dispatch behavior.
// This platform has only two backends (memory, supabase), same as
// lib/business and lib/financial.
describe("createStore", () => {
  it("defaults to a MemoryMarketStore when no backend is specified", () => {
    expect(createStore()).toBeInstanceOf(MemoryMarketStore);
  });

  it("returns a MemoryMarketStore for backend: 'memory'", () => {
    expect(createStore({ backend: "memory" })).toBeInstanceOf(MemoryMarketStore);
  });

  it("returns a SupabaseMarketStore for backend: 'supabase'", () => {
    expect(createStore({ backend: "supabase" })).toBeInstanceOf(SupabaseMarketStore);
  });

  it("throws for an unrecognized backend value", () => {
    const invalidBackend = "vector" as MarketStoreBackend;
    expect(() => createStore({ backend: invalidBackend })).toThrow(
      "Unknown market store backend: vector"
    );
  });
});
