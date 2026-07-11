// Public entry point for the Business Intelligence Platform. Every
// future system this milestone anticipates (Investor Intelligence,
// Reports, Dashboard, API, Recommendations — see BUSINESS_PLATFORM.md's
// Future Roadmap) should import from here, never from a deep path into a
// specific subfolder — the same discipline lib/competitors', lib/market's,
// and lib/financial's public barrels enforce for themselves.
export { buildBusinessProfile } from "@/lib/business/knowledge/businessProfileBuilder";
export { mergeBusinessProfile } from "@/lib/business/knowledge/profileMerger";
export { discoverBusiness } from "@/lib/business/knowledge/businessDiscovery";

export { deriveBusinessModelFields } from "@/lib/business/model/businessModelSynthesis";
export { derivePositioning } from "@/lib/business/positioning/positioningSynthesis";
export { buildEconomicMoat, deriveEconomicMoat } from "@/lib/business/moat/economicMoat";
export { deriveGoToMarket } from "@/lib/business/gtm/gtmSynthesis";
export { deriveGrowth } from "@/lib/business/growth/growthSynthesis";
export { deriveStrategy } from "@/lib/business/strategy/strategySynthesis";
export { buildDependency, deriveExecution } from "@/lib/business/execution";
export { buildOperationalRisk, deriveOperationalRisks } from "@/lib/business/risk/operationalRisk";
export { deriveBusinessSwot } from "@/lib/business/profile/businessSwot";
export { deriveOverallHealth } from "@/lib/business/profile/businessHealth";

export { buildRecommendation } from "@/lib/business/recommendations/recommendationBuilder";

export { scoreBusiness } from "@/lib/business/scoring/scoringEngine";

export {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleBusinesses,
} from "@/lib/business/refresh/businessRefreshEngine";
export { isBusinessStale } from "@/lib/business/refresh/businessRefreshPolicy";

export { createStore } from "@/lib/business/storage/createStore";
export { MemoryBusinessStore } from "@/lib/business/storage/memoryStore";

export * from "@/lib/business/schemas";
export * from "@/lib/business/types";
