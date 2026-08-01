import type { SupabaseClient } from "@supabase/supabase-js";
import { CompanyProfileSchema, type CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";
import type { StorageAdapter } from "@/lib/persistence/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAdapter } from "@/lib/persistence/adapters/supabaseAdapter";
import { createRepository } from "@/lib/persistence/createRepository";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";

interface CompanyProfileRow {
  id: string;
  analysis_id: string;
  name: string;
  aliases: unknown;
  website: string | null;
  category: string | null;
  description: string | null;
  target_market: string | null;
  business_model: string | null;
  pricing: unknown;
  features: unknown;
  funding: unknown;
  technology: unknown;
  strengths: unknown;
  weaknesses: unknown;
  opportunities: unknown;
  threats: unknown;
  sources: unknown;
  evidence: unknown;
  confidence: number;
  refresh: unknown;
  created_at: string;
  updated_at: string;
}

function toRow(profile: CompanyProfile): CompanyProfileRow {
  return {
    id: profile.id,
    // Real production impact only: verified via competitorResolver.ts/
    // profileMerger.ts (see this table's own migration comment) that
    // every live upsert() call already sets analysisId. The `?? ""`
    // fallback exists purely to satisfy the column's NOT NULL
    // constraint for a caller outside that real path, never a silent
    // data-quality compromise — createRepository's own
    // validate-before-write still rejects an invalid profile before this
    // function ever runs, if analysisId's Zod shape is ever tightened to
    // required.
    analysis_id: profile.analysisId ?? "",
    name: profile.name,
    aliases: profile.aliases,
    website: profile.website ?? null,
    category: profile.category ?? null,
    description: profile.description ?? null,
    target_market: profile.targetMarket ?? null,
    business_model: profile.businessModel ?? null,
    pricing: profile.pricing ?? null,
    features: profile.features,
    funding: profile.funding ?? null,
    technology: profile.technology,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    opportunities: profile.opportunities,
    threats: profile.threats,
    sources: profile.sources,
    evidence: profile.evidence,
    confidence: profile.confidence,
    refresh: profile.refresh,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: Record<string, unknown>): CompanyProfile {
  const r = row as unknown as CompanyProfileRow;
  return {
    id: r.id,
    analysisId: r.analysis_id,
    name: r.name,
    aliases: r.aliases as CompanyProfile["aliases"],
    website: r.website ?? undefined,
    category: (r.category as CompanyProfile["category"]) ?? undefined,
    description: r.description ?? undefined,
    targetMarket: r.target_market ?? undefined,
    businessModel: r.business_model ?? undefined,
    pricing: (r.pricing as CompanyProfile["pricing"]) ?? undefined,
    features: r.features as CompanyProfile["features"],
    funding: (r.funding as CompanyProfile["funding"]) ?? undefined,
    technology: r.technology as CompanyProfile["technology"],
    strengths: r.strengths as CompanyProfile["strengths"],
    weaknesses: r.weaknesses as CompanyProfile["weaknesses"],
    opportunities: r.opportunities as CompanyProfile["opportunities"],
    threats: r.threats as CompanyProfile["threats"],
    sources: r.sources as CompanyProfile["sources"],
    evidence: r.evidence as CompanyProfile["evidence"],
    confidence: r.confidence,
    refresh: r.refresh as CompanyProfile["refresh"],
  };
}

// Real as of Milestone 125 (Milestone 124's own launch-readiness
// finding: this class was "ARCHITECTURE ONLY", every method throwing —
// switching defaultCompetitorStore to it, attempted directly in
// Milestone 124, was correctly reverted once that was discovered). Built
// on Milestone 105's persistence core for the plain, unscoped getById/
// upsert/delete (mirrors lib/pipeline/storage/supabaseStore.ts's own
// shape exactly); list() is implemented directly against the injected
// admin client instead, since Milestone 105's generic adapter has no
// concept of a scoped query — the same reason upsertWithVersionCheck
// bypasses it there. findByName() is deliberately NOT a second, SQL-side
// reimplementation of the fuzzy name/alias matching
// MemoryCompetitorStore already owns — it calls this same class's own
// list(analysisId) and applies the identical normalize-and-compare logic
// inline, so both backends can never silently drift into two different
// notions of "the same company" (this milestone's own "do not introduce
// duplicate persistence logic" requirement).
//
// Uses the service-role admin client, not the cookie-aware one: see
// lib/supabase/admin.ts's own comment and this table's own migration —
// neither CompanyProfile nor its resolver has ever had a user-session
// concept to carry (a pipeline stage is a trusted server process, not a
// signed-in caller's own request), the identical reasoning already
// documented there for analysis_sessions/pipeline_executions.
export class SupabaseCompetitorStore implements CompetitorKnowledgeStore {
  private cachedClient: SupabaseClient | null = null;
  private cachedRepository: StorageAdapter<CompanyProfile> | null = null;

  constructor(private readonly tableName: string = "competitor_profiles") {}

  private getClient(): SupabaseClient {
    if (!this.cachedClient) this.cachedClient = createAdminClient();
    return this.cachedClient;
  }

  private getRepository(): StorageAdapter<CompanyProfile> {
    if (!this.cachedRepository) {
      const adapter = createSupabaseAdapter<CompanyProfile>({
        client: this.getClient(),
        tableName: this.tableName,
        toRow: toRow as unknown as (profile: CompanyProfile) => Record<string, unknown>,
        fromRow,
      });
      this.cachedRepository = createRepository({
        adapter,
        schema: CompanyProfileSchema,
        resourceName: "competitor profile",
      });
    }
    return this.cachedRepository;
  }

  // Mirrors createRepository.ts's own run() shape: a ValidationError (an
  // already-stored row that no longer matches the schema) is rethrown
  // as-is, anything else (a real Supabase/network failure) becomes a
  // typed ExternalServiceError — never a bare Error escaping this class.
  private async runScopedQuery<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ExternalServiceError("Supabase", "Competitor profile storage operation failed.");
    }
  }

  async getById(id: string): Promise<CompanyProfile | null> {
    return this.getRepository().getById(id);
  }

  async findByName(name: string, analysisId: string): Promise<CompanyProfile | null> {
    const normalized = name.trim().toLowerCase();
    const profiles = await this.list(analysisId);

    for (const profile of profiles) {
      const names = [profile.name, ...profile.aliases].map((value) => value.trim().toLowerCase());
      if (names.includes(normalized)) return profile;
    }

    return null;
  }

  async list(analysisId: string): Promise<CompanyProfile[]> {
    return this.runScopedQuery(async () => {
      const client = this.getClient();
      const { data, error } = await client
        .from(this.tableName)
        .select("*")
        .eq("analysis_id", analysisId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return ((data as Record<string, unknown>[] | null) ?? []).map((row) =>
        parseOrThrow(CompanyProfileSchema, fromRow(row), "Stored competitor profile did not match the expected shape.")
      );
    });
  }

  async upsert(profile: CompanyProfile): Promise<void> {
    return this.getRepository().upsert(profile);
  }

  async delete(id: string): Promise<void> {
    return this.getRepository().delete(id);
  }
}
