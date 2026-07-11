import type { Source, Evidence } from "@/lib/research";
import type { CustomerSegment } from "@/lib/market";
import type { RevenueModel } from "@/lib/financial";
import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import { BusinessProfileSchema } from "@/lib/business/schemas/business.schema";
import { deriveBusinessModelFields } from "@/lib/business/model/businessModelSynthesis";
import { deriveStrategy } from "@/lib/business/strategy/strategySynthesis";
import { deriveExecution } from "@/lib/business/execution/executionSynthesis";
import { deriveOperationalRisks } from "@/lib/business/risk/operationalRisk";
import { deriveBusinessSwot } from "@/lib/business/profile/businessSwot";
import { deriveOverallHealth } from "@/lib/business/profile/businessHealth";
import { buildBusinessRefreshMetadata } from "@/lib/business/refresh/businessRefreshPolicy";
import { parseOrThrow } from "@/lib/validation/parse";

let businessIdCounter = 0;

function nextBusinessId(): string {
  businessIdCounter += 1;
  return `business_${Date.now()}_${businessIdCounter}`;
}

export interface BuildBusinessProfileInput {
  customerSegments?: CustomerSegment[];
  revenueModel?: RevenueModel;
  revenueStrategyRationale?: string;
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
  now?: Date;
}

// The one place a brand-new BusinessProfile gets constructed — mirrors
// lib/competitors'/lib/market's/lib/financial's own profile builders
// exactly, but this one's job is SYNTHESIS: it composes every facet
// folder's own (real-passthrough-or-honestly-empty) output into one
// schema-valid object, rather than computing anything itself. Every
// field beyond what a caller explicitly supplies (customerSegments,
// revenueModel, sources, evidence, confidence — all real, discovered
// data) stays exactly as honest as its owning facet already made it.
export function buildBusinessProfile(input: BuildBusinessProfileInput): BusinessProfile {
  const now = input.now ?? new Date();

  const model = deriveBusinessModelFields({
    customerSegments: input.customerSegments,
    revenueModel: input.revenueModel,
    revenueStrategyRationale: input.revenueStrategyRationale,
  });
  const strategy = deriveStrategy();
  const execution = deriveExecution();
  const operationalRisks = deriveOperationalRisks();
  const swot = deriveBusinessSwot();
  const overallHealth = deriveOverallHealth();

  return parseOrThrow(
    BusinessProfileSchema,
    {
      id: nextBusinessId(),

      businessModel: model.businessModel,
      valueProposition: undefined,
      customerProblem: undefined,
      customerSegments: model.customerSegments,
      revenueStrategy: model.revenueStrategy,

      goToMarketStrategy: strategy.goToMarketStrategy,
      distributionChannels: strategy.distributionChannels,
      growthStrategy: strategy.growthStrategy,
      growthDrivers: strategy.growthDrivers,
      expansionOpportunities: strategy.expansionOpportunities,

      competitivePosition: strategy.competitivePosition,
      competitiveAdvantages: strategy.competitiveAdvantages,
      economicMoat: strategy.economicMoat,

      executionComplexity: execution.executionComplexity,
      keyDependencies: execution.keyDependencies,
      operationalRisks,

      businessStrengths: swot.strengths,
      businessWeaknesses: swot.weaknesses,
      businessOpportunities: swot.opportunities,
      businessThreats: swot.threats,
      overallHealth,

      sources: input.sources ?? [],
      evidence: input.evidence ?? [],
      confidence: input.confidence,
      refresh: buildBusinessRefreshMetadata("initial_discovery", input.confidence, now),
    },
    "Failed to build a schema-valid BusinessProfile."
  );
}
