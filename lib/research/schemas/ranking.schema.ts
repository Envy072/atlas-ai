import { z } from "zod";
import { SourceSchema } from "@/lib/research/schemas/source.schema";

// The five dimensions this engine scores every source on — see
// lib/research/ranking/factors.ts. Each is 0-100; none are computed by a
// real algorithm yet.
export const RankingFactorsSchema = z.object({
  authority: z.number().min(0).max(100),
  freshness: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  trust: z.number().min(0).max(100),
  sourceQuality: z.number().min(0).max(100),
});

export type RankingFactors = z.infer<typeof RankingFactorsSchema>;

// A Source plus its ranking. Deliberately a distinct schema from
// SourceSchema (not the same shape with optional extra fields) — a raw
// per-provider hit (ProviderResult.sources) isn't ranked yet, but a
// ResearchResult's final source list is, and the type system should make
// that distinction, not just convention.
export const RankedSourceSchema = SourceSchema.extend({
  score: z.number().min(0).max(100),
  factors: RankingFactorsSchema,
});

export type RankedSource = z.infer<typeof RankedSourceSchema>;
