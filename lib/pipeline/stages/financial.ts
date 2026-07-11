import { discoverFinancials } from "@/lib/financial";
import type { FinancialDiscoveryResult } from "@/lib/financial";
import type { PipelineStageDefinition } from "@/lib/pipeline/types/stage";

// Wraps lib/financial's own public discoverFinancials() — never a
// provider, never a deep import. See MILESTONE_11_DESIGN.md Section 5.
export const financialStage: PipelineStageDefinition<FinancialDiscoveryResult> = {
  name: "financial",
  async run(startupIdea) {
    return discoverFinancials({ startupIdea });
  },
};
