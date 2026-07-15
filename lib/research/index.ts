// Public entry point for the Research Engine. runResearch() is called
// by lib/pipeline/stages/research.ts (the pipeline's own research
// stage) and by each of the five knowledge platforms' own discovery
// functions (lib/financial/knowledge/financialDiscovery.ts,
// lib/business/knowledge/businessDiscovery.ts,
// lib/market/knowledge/marketDiscovery.ts,
// lib/competitors/discovery/competitorDiscovery.ts,
// lib/decision/engine/decisionEngine.ts) — confirmed live, not planned
// (MILESTONE_32_DESIGN.md Section 5.3).
export { runResearch } from "@/lib/research/orchestrator/researchOrchestrator";
export { selectProviders } from "@/lib/research/orchestrator/providerSelector";
export { searchViaProviderManager } from "@/lib/research/manager/providerManager";
export { getAllMetricsSnapshots, getMetricsSnapshot } from "@/lib/research/manager/metrics";
export { computeHealth } from "@/lib/research/manager/health";
export { rankSources } from "@/lib/research/ranking/rankingEngine";
export { buildEvidence } from "@/lib/research/evidence/evidenceBuilder";
export { buildCitation } from "@/lib/research/evidence/citationBuilder";
export { createCache } from "@/lib/research/cache/createCache";
export { getRegisteredProviders, getProviderById } from "@/lib/research/providers/registry";

export * from "@/lib/research/schemas";
export * from "@/lib/research/types";
