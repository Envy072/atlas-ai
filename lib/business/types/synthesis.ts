import type { CustomerSegment } from "@/lib/market";
import type { CompetitivePosition, ExecutionComplexityLevel } from "@/lib/business/schemas/enums";
import type { EconomicMoat } from "@/lib/business/schemas/moat.schema";
import type { Dependency } from "@/lib/business/schemas/execution.schema";

// Intermediate composition shapes each facet folder's derive*() function
// returns — plain TS interfaces, not Zod schemas, since none of these
// crosses a validation boundary itself; only their constituent fields do,
// once knowledge/businessProfileBuilder.ts flattens them into a single
// BusinessProfileSchema-valid object. Mirrors lib/market's
// non-schema RankingContext/MarketSizingContext treatment.

export interface BusinessModelFields {
  businessModel?: string;
  customerSegments: CustomerSegment[];
  revenueStrategy?: string;
}

export interface PositioningFields {
  competitivePosition?: CompetitivePosition;
  competitiveAdvantages: string[];
}

export interface GoToMarketFields {
  goToMarketStrategy?: string;
  distributionChannels: string[];
}

export interface GrowthFields {
  growthStrategy?: string;
  growthDrivers: string[];
  expansionOpportunities: string[];
}

// What strategy/strategySynthesis.ts composes from positioning/moat/gtm/growth.
export interface StrategyFields {
  competitivePosition?: CompetitivePosition;
  competitiveAdvantages: string[];
  economicMoat: EconomicMoat;
  goToMarketStrategy?: string;
  distributionChannels: string[];
  growthStrategy?: string;
  growthDrivers: string[];
  expansionOpportunities: string[];
}

export interface ExecutionFields {
  executionComplexity?: ExecutionComplexityLevel;
  keyDependencies: Dependency[];
}

export interface BusinessSwot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}
