import type { ProviderId } from "@/lib/research/schemas/enums";
import type { ResearchProvider } from "@/lib/research/types/provider";
import { getRegisteredProviders, getProviderById } from "@/lib/research/providers/registry";

// Picks which providers a request should run against: an explicit list
// if the caller named one (silently skipping any id that isn't
// registered yet, rather than throwing — a caller might reasonably ask
// for "tavily" today even though no TavilyProvider exists), or every
// registered provider otherwise.
export function selectProviders(providerIds?: ProviderId[]): ResearchProvider[] {
  if (!providerIds || providerIds.length === 0) {
    return getRegisteredProviders();
  }

  return providerIds
    .map((id) => getProviderById(id))
    .filter((provider): provider is ResearchProvider => provider !== undefined);
}
