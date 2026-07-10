import type { ProviderId } from "@/lib/research/schemas/enums";
import type { ResearchProvider } from "@/lib/research/types/provider";
import { googleProvider } from "@/lib/research/providers/googleProvider";
import { braveProvider } from "@/lib/research/providers/braveProvider";
import { redditProvider } from "@/lib/research/providers/redditProvider";
import { crunchbaseProvider } from "@/lib/research/providers/crunchbaseProvider";
import { githubProvider } from "@/lib/research/providers/githubProvider";
import { newsProvider } from "@/lib/research/providers/newsProvider";

// Every provider the orchestrator can select from today. Tavily, Bing,
// company-website, and government-dataset providers are already valid
// `ProviderId`s (see schemas/enums.ts) — adding their real modules later
// means writing the file and adding one entry here, nothing else.
export const PROVIDER_REGISTRY: Partial<Record<ProviderId, ResearchProvider>> = {
  google: googleProvider,
  brave: braveProvider,
  reddit: redditProvider,
  crunchbase: crunchbaseProvider,
  github: githubProvider,
  news: newsProvider,
};

export function getRegisteredProviders(): ResearchProvider[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getProviderById(id: ProviderId): ResearchProvider | undefined {
  return PROVIDER_REGISTRY[id];
}
