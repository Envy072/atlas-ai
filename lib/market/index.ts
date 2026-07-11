// Public entry point for the Market Intelligence Platform. Every future
// module this milestone anticipates (Financial Intelligence, Investor
// Intelligence, Reports, Dashboard — see MARKET_PLATFORM.md's Future
// Roadmap) should import from here, never from a deep path into a
// specific subfolder — the same discipline lib/competitors' and
// lib/research's public barrels enforce for themselves.
export { buildMarketProfile } from "@/lib/market/knowledge/marketProfileBuilder";
export { mergeMarketProfile } from "@/lib/market/knowledge/profileMerger";
export { discoverMarket } from "@/lib/market/knowledge/marketDiscovery";

export { classifyIndustry } from "@/lib/market/classification/industryClassifier";

export { buildMarketSizing, estimateTAM, estimateSAM, estimateSOM } from "@/lib/market/sizing/marketSizing";

export { buildCustomerSegment } from "@/lib/market/segmentation/customerSegmentation";
export { buildGeographicMarket } from "@/lib/market/geography/geographicMarket";
export { buildMarketTrend } from "@/lib/market/trends/marketTrend";
export { buildRegulation } from "@/lib/market/regulation/regulation";
export { buildMarketRisk } from "@/lib/market/risks/marketRisk";

export { scoreMarket } from "@/lib/market/scoring/scoringEngine";

export {
  requestManualRefresh,
  requestScheduledRefresh,
  requestStaleRefresh,
  collectStaleMarkets,
} from "@/lib/market/refresh/marketRefreshEngine";
export { isMarketStale } from "@/lib/market/refresh/marketRefreshPolicy";

export { createStore } from "@/lib/market/storage/createStore";
export { MemoryMarketStore } from "@/lib/market/storage/memoryStore";

export * from "@/lib/market/schemas";
export * from "@/lib/market/types";
