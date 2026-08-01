import { describe, it, expect } from "vitest";
import { defaultMarketStore } from "@/lib/market/storage/defaultStore";
import { SupabaseMarketStore } from "@/lib/market/storage/supabaseStore";

// Milestone 67 — this module is one line (createStore() called once at
// import time), but that one line encodes a real architectural invariant
// this file's own comment names explicitly: every consumer that omits its
// own store must share the exact same instance, or "knowledge accumulates
// across runs" silently breaks.
//
// Milestone 125 — the default backend flipped from "memory" to
// "supabase" now that SupabaseMarketStore is a real implementation
// rather than "ARCHITECTURE ONLY" (Milestone 124's own launch-readiness
// finding). The "single shared instance" check below now asserts
// referential identity (`toBe`) directly instead of round-tripping real
// data through upsert()/getById(): SupabaseMarketStore lazily constructs
// a real Supabase admin client on first use (see its own getClient()),
// which this file has no live credentials to exercise — and doesn't need
// to, since referential identity is a strictly more direct proof of "the
// same module-level instance" than "two instances happen to observe the
// same write" ever was.
describe("defaultMarketStore", () => {
  it("defaults to a SupabaseMarketStore", () => {
    expect(defaultMarketStore).toBeInstanceOf(SupabaseMarketStore);
  });

  it("is a single shared instance — re-importing the module resolves to the exact same object", async () => {
    const { defaultMarketStore: reimported } = await import("@/lib/market/storage/defaultStore");

    expect(reimported).toBe(defaultMarketStore);
  });
});
