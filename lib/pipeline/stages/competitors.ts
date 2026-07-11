import { discoverCompetitors } from "@/lib/competitors";
import type { CompetitorDiscoveryResult } from "@/lib/competitors";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// Wraps lib/competitors' own public discoverCompetitors() — never a
// provider, never a deep import. See MILESTONE_11_DESIGN.md Section 5.
export const competitorsStage: PipelineStageDefinition<CompetitorDiscoveryResult> = {
  name: "competitors",
  async run(startupIdea) {
    return discoverCompetitors({ startupIdea });
  },
};
