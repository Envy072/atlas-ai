import { z } from "zod";
import { ResearchRequestSchema } from "@/lib/research/schemas/researchRequest.schema";
import { RankedSourceSchema } from "@/lib/research/schemas/ranking.schema";
import { EvidenceSchema } from "@/lib/research/schemas/evidence.schema";
import { ProviderResultSchema } from "@/lib/research/schemas/providerResult.schema";
import {
  ProviderSummarySchema,
  SourceSummarySchema,
  SearchStatisticsSchema,
} from "@/lib/research/schemas/summary.schema";

// The orchestrator's unified output: the request that produced it, every
// deduplicated *and ranked* source (RankedSourceSchema, not the plain
// SourceSchema each ProviderResult carries — see ranking.schema.ts), any
// evidence built from those sources, and each individual provider's own
// result (kept for traceability/debugging — e.g. "why is source X
// missing? check its provider's status/error").
//
// Milestone 5 additions (providerSummary/sourceSummary/searchStatistics)
// are purely additive — nothing outside lib/research/ constructs or reads
// a ResearchResult yet, so there's no existing consumer to break; see
// PROVIDER_MANAGER.md.
export const ResearchResultSchema = z.object({
  request: ResearchRequestSchema,
  sources: z.array(RankedSourceSchema),
  evidence: z.array(EvidenceSchema),
  providerResults: z.array(ProviderResultSchema),
  providerSummary: z.array(ProviderSummarySchema),
  sourceSummary: SourceSummarySchema,
  searchStatistics: SearchStatisticsSchema,
  generatedAt: z.string(),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;
