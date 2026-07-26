import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

// The one interface every knowledge-base backend implements. Callers (the
// discovery/refresh engines, eventually a future route) depend only on
// this — swapping memory for Supabase in production is a one-line change
// at the call site that constructs the store, not a rewrite of anything
// that uses it. Mirrors lib/research/types/cache.ts's ResearchCache shape
// (same project, same pattern) but for a durable, queryable knowledge base
// rather than an ephemeral TTL cache.
//
// Milestone 116 — both findByName() and list() now require the caller's
// own analysisId and scope their results to it: a company profile
// belongs to exactly one analysis, so matching a new candidate against
// "every company ever discovered by any analysis" (the prior, global
// list()) let two unrelated analyses' competitor data merge whenever a
// fuzzy name match happened to fire — Milestone 114's Critical Finding
// #1. Ownership is enforced here, in the store's own query surface, not
// left to each caller to filter correctly after the fact.
export interface CompetitorKnowledgeStore {
  getById(id: string): Promise<CompanyProfile | null>;
  findByName(name: string, analysisId: string): Promise<CompanyProfile | null>;
  list(analysisId: string): Promise<CompanyProfile[]>;
  upsert(profile: CompanyProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
