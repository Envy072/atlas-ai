import type { ProviderId, SourceType } from "@/lib/research/schemas/enums";

// A role (source type) mapped to an ordered list of providers to try in
// sequence. The first that returns a usable result (see
// providerManager.ts's isUsableResult) wins; anything else — error,
// timeout, empty, not_configured, or degraded/offline health — falls
// through to the next entry. Adding a new fallback pair later (e.g. a
// second news provider) means adding one array entry here; nothing else
// in ProviderManager changes.
export const FALLBACK_CHAINS: Partial<Record<SourceType, ProviderId[]>> = {
  search_engine: ["tavily", "brave"],
};
