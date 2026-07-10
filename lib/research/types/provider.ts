import type { ProviderId, SourceType } from "@/lib/research/schemas/enums";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";

// What an individual provider's search() actually needs — deliberately
// narrower than ResearchRequest (a provider doesn't care which *other*
// providers were selected, only what to search for and how much of it).
export interface ProviderQuery {
  topic: string;
  maxResults?: number;
  freshnessWindowDays?: number;
}

// Every provider — real or, for now, placeholder — implements exactly
// this shape. The orchestrator only ever depends on this interface, never
// on a specific provider's internals, so adding a real GovernmentDatasetProvider
// later means writing one new file that satisfies this contract and
// registering it in providers/registry.ts — nothing else changes.
export interface ResearchProvider {
  id: ProviderId;
  name: string;
  sourceType: SourceType;
  search(query: ProviderQuery): Promise<ProviderResult>;
}
