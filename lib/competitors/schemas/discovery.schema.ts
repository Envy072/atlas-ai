import { z } from "zod";
import { SourceSchema, EvidenceSchema } from "@/lib/research";

// What a caller asks the discovery engine for: a startup idea in, an
// optional cap on how many candidates to return.
export const CompetitorDiscoveryRequestSchema = z.object({
  startupIdea: z.string().min(1),
  maxCandidates: z.number().int().positive().optional(),
});

export type CompetitorDiscoveryRequest = z.infer<typeof CompetitorDiscoveryRequestSchema>;

// One potential competitor the discovery engine surfaced — deliberately
// not yet a full CompanyProfile (that's only built once the candidate is
// accepted into the knowledge base, see knowledge/companyProfileBuilder.ts).
// A candidate is provisional: its `name` is a heuristic extraction (see
// discovery/candidateExtraction.ts), not a confirmed entity.
export const DiscoveredCompetitorSchema = z.object({
  candidateName: z.string(),
  website: z.string().url().optional(),
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
});

export type DiscoveredCompetitor = z.infer<typeof DiscoveredCompetitorSchema>;

export const CompetitorDiscoveryResultSchema = z.object({
  request: CompetitorDiscoveryRequestSchema,
  candidates: z.array(DiscoveredCompetitorSchema),
  generatedAt: z.string(),
});

export type CompetitorDiscoveryResult = z.infer<typeof CompetitorDiscoveryResultSchema>;
