import { discoverMarket } from "@/lib/market";
import type { MarketDiscoveryResult } from "@/lib/market";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// Wraps lib/market's own public discoverMarket() — never a provider,
// never a deep import. See MILESTONE_11_DESIGN.md Section 5.
export const marketStage: PipelineStageDefinition<MarketDiscoveryResult> = {
  name: "market",
  async run(startupIdea) {
    return discoverMarket({ startupIdea });
  },
};
