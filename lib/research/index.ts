// Public entry point for the Research Engine. Nothing outside
// lib/research/ imports from this yet — lib/analysis/, lib/services/,
// and app/api/ are frozen this milestone (see RESEARCH_ENGINE.md's
// Future Integration Plan for how a later milestone wires this in).
export { runResearch } from "@/lib/research/orchestrator/researchOrchestrator";
export { selectProviders } from "@/lib/research/orchestrator/providerSelector";
export { rankSources } from "@/lib/research/ranking/rankingEngine";
export { buildEvidence } from "@/lib/research/evidence/evidenceBuilder";
export { buildCitation } from "@/lib/research/evidence/citationBuilder";
export { createCache } from "@/lib/research/cache/createCache";
export { getRegisteredProviders, getProviderById } from "@/lib/research/providers/registry";

export * from "@/lib/research/schemas";
export * from "@/lib/research/types";
