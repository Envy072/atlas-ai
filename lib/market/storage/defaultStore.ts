import { createStore } from "@/lib/market/storage/createStore";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";

// The ONE shared default store instance every knowledge-resolution
// function falls back to when a caller doesn't supply its own —
// deliberately a single module-level instance, not one createStore()
// call per consumer. Mirrors lib/competitors/storage/defaultStore.ts
// (Milestone 16) and lib/analysis-session/storage/defaultStore.ts
// (Milestone 12) exactly — the same "two independent stores silently
// disagree" bug avoided proactively here.
//
// Explicitly requests "supabase" (Milestone 125, closing the gap
// Milestone 124 found and Milestone 125 Phase 1/2/3 exists to fix) now
// that SupabaseMarketStore is a real implementation rather than
// "ARCHITECTURE ONLY" — an in-memory default here meant a retried
// resolution on a different server instance (or after a cold start)
// silently failed to find this same analysis's own prior attempt,
// degrading a retry's merge quality with no visible error. Matches
// lib/analysis-session/storage/defaultStore.ts's exact precedent; that
// default stays "memory" for any other caller (e.g. this module's own
// tests).
export const defaultMarketStore: MarketKnowledgeStore = createStore({ backend: "supabase" });
