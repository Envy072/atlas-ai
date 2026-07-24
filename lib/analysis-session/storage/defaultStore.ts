import { createStore } from "@/lib/analysis-session/storage/createStore";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";

// The ONE shared default store instance every lifecycle/events function
// falls back to when a caller doesn't supply its own. Deliberately a
// single module-level instance, not one `createStore()` call per
// consumer — two independent stores would each disagree about what
// sessions exist (a session created against one would be invisible to
// the other). Every module in this package that needs a default store
// imports this one, never calls createStore() itself for that purpose.
//
// Explicitly requests "supabase" (Milestone 106) rather than relying on
// createStore()'s own "memory" default — that default stays unchanged
// for any other caller (e.g. this module's own tests, which construct a
// MemoryAnalysisSessionStore directly and never touch this file) so it
// keeps meaning "an in-memory store" everywhere else. Reverting this one
// production wiring decision is a one-line change back to `createStore()`
// with no arguments.
export const defaultAnalysisSessionStore: AnalysisSessionStore = createStore({ backend: "supabase" });
