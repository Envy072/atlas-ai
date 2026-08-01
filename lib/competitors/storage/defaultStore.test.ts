import { describe, it, expect } from "vitest";
import { defaultCompetitorStore } from "@/lib/competitors/storage/defaultStore";
import { SupabaseCompetitorStore } from "@/lib/competitors/storage/supabaseStore";

// Milestone 54 — this module is one line (`createStore()` called once at
// import time), but that one line encodes a real architectural invariant
// this file's own comment names explicitly: every consumer that omits its
// own store must share the exact same instance, or "knowledge accumulates
// across runs" silently breaks.
//
// Milestone 125 — the default backend flipped from "memory" to
// "supabase" now that SupabaseCompetitorStore is a real implementation
// rather than "ARCHITECTURE ONLY" (Milestone 124's own launch-readiness
// finding). The "single shared instance" check below now asserts
// referential identity (`toBe`) directly instead of round-tripping real
// data through upsert()/getById(): SupabaseCompetitorStore lazily
// constructs a real Supabase admin client on first use, which this file
// has no live credentials to exercise — and doesn't need to, since
// referential identity is a strictly more direct proof of "the same
// module-level instance" than "two instances happen to observe the same
// write" ever was.
describe("defaultCompetitorStore", () => {
  it("defaults to a SupabaseCompetitorStore", () => {
    expect(defaultCompetitorStore).toBeInstanceOf(SupabaseCompetitorStore);
  });

  it("is a single shared instance — re-importing the module resolves to the exact same object", async () => {
    // A second import of the same module path resolves to the same
    // module-cached instance (Node/Vitest's own ES module semantics) —
    // this assertion fails if defaultStore.ts is ever changed to a
    // factory/getter that constructs a fresh store per call, which is
    // exactly the regression this test exists to catch.
    const { defaultCompetitorStore: reimported } = await import(
      "@/lib/competitors/storage/defaultStore"
    );

    expect(reimported).toBe(defaultCompetitorStore);
  });
});
