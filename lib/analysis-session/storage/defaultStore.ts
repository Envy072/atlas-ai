import { createStore } from "@/lib/analysis-session/storage/createStore";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";

// The ONE shared default store instance every lifecycle/events function
// falls back to when a caller doesn't supply its own. Deliberately a
// single module-level instance, not one `createStore()` call per
// consumer — two independent MemoryAnalysisSessionStore instances would
// each hold their own empty Map and silently disagree about what
// sessions exist (a session created against one would be invisible to
// the other). Every module in this package that needs a default store
// imports this one, never calls createStore() itself for that purpose.
export const defaultAnalysisSessionStore: AnalysisSessionStore = createStore();
