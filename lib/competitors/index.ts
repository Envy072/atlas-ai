// Public entry point for the Competitor Intelligence Platform. Every
// future module this milestone anticipates (Market Intelligence,
// Financial Intelligence, Investor Reports — see COMPETITOR_PLATFORM.md's
// Future Roadmap) should import from here, never from a deep path into a
// specific subfolder — that's what keeps this platform swappable/
// extensible the same way lib/research's public barrel does for
// providers.
export { buildCompanyProfile } from "@/lib/competitors/knowledge/companyProfileBuilder";
export { mergeCompanyProfile } from "@/lib/competitors/knowledge/profileMerger";
export { resolveCompetitorKnowledge } from "@/lib/competitors/knowledge/competitorResolver";

export { discoverCompetitors } from "@/lib/competitors/discovery/competitorDiscovery";
export { extractCandidateName } from "@/lib/competitors/discovery/candidateExtraction";

export { matchCompanyName } from "@/lib/competitors/matcher/entityMatcher";

export { buildComparison } from "@/lib/competitors/comparison/comparisonEngine";

export { scoreCompany } from "@/lib/competitors/scoring/scoringEngine";

export {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleCompanies,
} from "@/lib/competitors/refresh/refreshEngine";
export {
  computeNextRefresh,
  determineRefreshPriority,
  isStale,
} from "@/lib/competitors/refresh/refreshPolicy";

export { createStore } from "@/lib/competitors/storage/createStore";
export { MemoryCompetitorStore } from "@/lib/competitors/storage/memoryStore";

export * from "@/lib/competitors/schemas";
export * from "@/lib/competitors/types";
