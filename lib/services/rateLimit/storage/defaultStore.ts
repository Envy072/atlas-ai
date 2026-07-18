import { createStore } from "@/lib/services/rateLimit/storage/createStore";
import type { RateLimitStore } from "@/lib/services/rateLimit/types";

// The one shared default store every call to checkRateLimit() falls
// back to unless a caller supplies its own (tests do) — mirrors
// lib/analysis-session/storage/defaultStore.ts's own reasoning: a
// single shared instance, not one per caller.
export const defaultRateLimitStore: RateLimitStore = createStore();
