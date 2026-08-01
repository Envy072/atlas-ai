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
//
// Explicitly requests "supabase" (Milestone 125, closing the gap
// Milestone 124 found) now that SupabaseCompetitorStore is a real
// implementation rather than "ARCHITECTURE ONLY" — an in-memory default
// here meant a retried resolution on a different server instance (or
// after a cold start) silently failed to find this same analysis's own
// prior attempt, degrading a retry's merge quality with no visible
// error. That default stays "memory" for any other caller (e.g. this
// module's own tests).
export const defaultCompetitorStore: CompetitorKnowledgeStore = createStore({ backend: "supabase" });
