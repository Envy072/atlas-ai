import { createStore } from "@/lib/market/storage/createStore";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";

// The ONE shared default store instance every knowledge-resolution
// function falls back to when a caller doesn't supply its own —
// deliberately a single module-level instance, not one createStore()
// call per consumer. Mirrors lib/competitors/storage/defaultStore.ts
// (Milestone 16) and lib/analysis-session/storage/defaultStore.ts
// (Milestone 12) exactly — the same "two independent stores silently
// disagree" bug avoided proactively here.
export const defaultMarketStore: MarketKnowledgeStore = createStore();
