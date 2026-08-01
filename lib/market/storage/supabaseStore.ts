import type { SupabaseClient } from "@supabase/supabase-js";
import { MarketProfileSchema, type MarketProfile } from "@/lib/market/schemas/market.schema";
import type { MarketKnowledgeStore } from "@/lib/market/types/storage";
import type { StorageAdapter } from "@/lib/persistence/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAdapter } from "@/lib/persistence/adapters/supabaseAdapter";
import { createRepository } from "@/lib/persistence/createRepository";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";

interface MarketProfileRow {
  id: string;
  analysis_id: string;
  industry: string;
  sub_industry: string | null;
  sizing: unknown;
  customer_segments: unknown;
  geographic_markets: unknown;
  growth_rate: unknown;
  market_maturity: string | null;
  regulations: unknown;
  risks: unknown;
  trends: unknown;
  sources: unknown;
  evidence: unknown;
  confidence: number;
  refresh: unknown;
  created_at: string;
  updated_at: string;
}

function toRow(profile: MarketProfile): MarketProfileRow {
  return {
    id: profile.id,
    // Real production impact only: verified via marketResolver.ts/
    // profileMerger.ts (see this table's own migration comment) that
    // every live upsert() call already sets analysisId. The `?? ""`
    // fallback exists purely to satisfy the column's NOT NULL
    // constraint for a caller outside that real path (a hand-built test
    // fixture omitting it), never a silent data-quality compromise —
    // createRepository's own validate-before-write still rejects an
    // invalid profile before this function ever runs, if analysisId's
    // Zod shape is ever tightened to required.
    analysis_id: profile.analysisId ?? "",
    industry: profile.industry,
    sub_industry: profile.subIndustry ?? null,
    sizing: profile.sizing,
    customer_segments: profile.customerSegments,
    geographic_markets: profile.geographicMarkets,
    growth_rate: profile.growthRate ?? null,
    market_maturity: profile.marketMaturity ?? null,
    regulations: profile.regulations,
    risks: profile.risks,
    trends: profile.trends,
    sources: profile.sources,
    evidence: profile.evidence,
    confidence: profile.confidence,
    refresh: profile.refresh,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: Record<string, unknown>): MarketProfile {
  const r = row as unknown as MarketProfileRow;
  return {
    id: r.id,
    analysisId: r.analysis_id,
    industry: r.industry,
    subIndustry: r.sub_industry ?? undefined,
    sizing: r.sizing as MarketProfile["sizing"],
    customerSegments: r.customer_segments as MarketProfile["customerSegments"],
    geographicMarkets: r.geographic_markets as MarketProfile["geographicMarkets"],
    growthRate: (r.growth_rate as MarketProfile["growthRate"]) ?? undefined,
    marketMaturity: (r.market_maturity as MarketProfile["marketMaturity"]) ?? undefined,
    regulations: r.regulations as MarketProfile["regulations"],
    risks: r.risks as MarketProfile["risks"],
    trends: r.trends as MarketProfile["trends"],
    sources: r.sources as MarketProfile["sources"],
    evidence: r.evidence as MarketProfile["evidence"],
    confidence: r.confidence,
    refresh: r.refresh as MarketProfile["refresh"],
  };
}

// Real as of Milestone 125 (Milestone 124's own launch-readiness
// finding: this class was "ARCHITECTURE ONLY", every method throwing —
// switching defaultMarketStore to it, attempted directly in Milestone
// 124, was correctly reverted once that was discovered). Built on
// Milestone 105's persistence core for the plain, unscoped getById/
// upsert/delete (mirrors lib/pipeline/storage/supabaseStore.ts's own
// shape exactly); the two analysisId-scoped methods
// (getByAnalysisId/list) are implemented directly against the injected
// admin client instead, since Milestone 105's generic adapter has no
// concept of a scoped query — the same reason upsertWithVersionCheck
// bypasses it there.
//
// Uses the service-role admin client, not the cookie-aware one: see
// lib/supabase/admin.ts's own comment and this table's own migration —
// neither MarketProfile nor its resolver has ever had a user-session
// concept to carry (a pipeline stage is a trusted server process, not a
// signed-in caller's own request), the identical reasoning already
// documented there for analysis_sessions/pipeline_executions.
export class SupabaseMarketStore implements MarketKnowledgeStore {
  private cachedClient: SupabaseClient | null = null;
  private cachedRepository: StorageAdapter<MarketProfile> | null = null;

  constructor(private readonly tableName: string = "market_profiles") {}

  private getClient(): SupabaseClient {
    if (!this.cachedClient) this.cachedClient = createAdminClient();
    return this.cachedClient;
  }

  private getRepository(): StorageAdapter<MarketProfile> {
    if (!this.cachedRepository) {
      const adapter = createSupabaseAdapter<MarketProfile>({
        client: this.getClient(),
        tableName: this.tableName,
        toRow: toRow as unknown as (profile: MarketProfile) => Record<string, unknown>,
        fromRow,
      });
      this.cachedRepository = createRepository({
        adapter,
        schema: MarketProfileSchema,
        resourceName: "market profile",
      });
    }
    return this.cachedRepository;
  }

  // Both analysisId-scoped queries below share this same try/catch
  // shape as createRepository.ts's own run() helper: a ValidationError
  // (an already-stored row that no longer matches the schema) is
  // rethrown as-is, anything else (a real Supabase/network failure)
  // becomes a typed ExternalServiceError — never a bare Error escaping
  // this class.
  private async runScopedQuery<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ExternalServiceError("Supabase", "Market profile storage operation failed.");
    }
  }

  async getById(id: string): Promise<MarketProfile | null> {
    return this.getRepository().getById(id);
  }

  async getByAnalysisId(analysisId: string): Promise<MarketProfile | null> {
    return this.runScopedQuery(async () => {
      const client = this.getClient();
      // Ordered, deterministic tie-break (mirrors createSupabaseAdapter's
      // own list() convention) for the one case resolveMarketKnowledge's
      // own read-then-write isn't itself transactional against: two
      // concurrent retries for the same analysisId both reading "no
      // existing profile" and both inserting a fresh row. That race is
      // resolveMarketKnowledge's own business logic (unchanged by this
      // milestone), not this store's to prevent — but this store's own
      // read must still resolve to exactly one row predictably, rather
      // than whichever Postgres happens to return first.
      const { data, error } = await client
        .from(this.tableName)
        .select("*")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return parseOrThrow(
        MarketProfileSchema,
        fromRow(data as Record<string, unknown>),
        "Stored market profile did not match the expected shape."
      );
    });
  }

  async list(analysisId: string): Promise<MarketProfile[]> {
    return this.runScopedQuery(async () => {
      const client = this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select("*")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return ((data as Record<string, unknown>[] | null) ?? []).map((row) =>
        parseOrThrow(MarketProfileSchema, fromRow(row), "Stored market profile did not match the expected shape.")
      );
    });
  }

  async upsert(profile: MarketProfile): Promise<void> {
    return this.getRepository().upsert(profile);
  }

  async delete(id: string): Promise<void> {
    return this.getRepository().delete(id);
  }
}
