import type { StrategyFields } from "@/lib/business/types/synthesis";
import { derivePositioning } from "@/lib/business/positioning/positioningSynthesis";
import { deriveEconomicMoat } from "@/lib/business/moat/economicMoat";
import { deriveGoToMarket } from "@/lib/business/gtm/gtmSynthesis";
import { deriveGrowth } from "@/lib/business/growth/growthSynthesis";

// The mid-tier synthesis layer this folder exists to provide: composes
// positioning/, moat/, gtm/, and growth/'s own (currently honest-empty)
// outputs into the single "strategic view of the business" shape
// knowledge/businessProfileBuilder.ts needs — so that builder calls one
// function here instead of four separate facet calls. Real composition
// logic, not fabrication: every value it returns is exactly what its four
// constituent facets already produced, nothing added.
export function deriveStrategy(): StrategyFields {
  const positioning = derivePositioning();
  const moat = deriveEconomicMoat();
  const gtm = deriveGoToMarket();
  const growth = deriveGrowth();

  return {
    competitivePosition: positioning.competitivePosition,
    competitiveAdvantages: positioning.competitiveAdvantages,
    economicMoat: moat,
    goToMarketStrategy: gtm.goToMarketStrategy,
    distributionChannels: gtm.distributionChannels,
    growthStrategy: growth.growthStrategy,
    growthDrivers: growth.growthDrivers,
    expansionOpportunities: growth.expansionOpportunities,
  };
}
