import { createStore } from "@/lib/competitors/storage/createStore";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";

// The ONE shared default store instance every knowledge-resolution
// function falls back to when a caller doesn't supply its own —
// deliberately a single module-level instance, not one createStore()
// call per consumer. Two independent MemoryCompetitorStore instances
// would each hold their own empty Map and silently disagree about which
// companies are known — a company resolved against one would be
// invisible to the other, silently defeating "knowledge accumulates
// across runs" (MILESTONE_16_DESIGN.md's entire premise). Mirrors
// lib/analysis-session/storage/defaultStore.ts's exact precedent — the
// same bug Milestone 12 already caught once, avoided here proactively.
export const defaultCompetitorStore: CompetitorKnowledgeStore = createStore();
