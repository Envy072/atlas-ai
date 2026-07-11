import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";

// The one interface every knowledge-base backend implements. Callers (the
// discovery/refresh engines, eventually a future route) depend only on
// this — swapping memory for Supabase in production is a one-line change
// at the call site that constructs the store, not a rewrite of anything
// that uses it. Mirrors lib/research/types/cache.ts's ResearchCache shape
// (same project, same pattern) but for a durable, queryable knowledge base
// rather than an ephemeral TTL cache.
export interface CompetitorKnowledgeStore {
  getById(id: string): Promise<CompanyProfile | null>;
  findByName(name: string): Promise<CompanyProfile | null>;
  list(): Promise<CompanyProfile[]>;
  upsert(profile: CompanyProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
