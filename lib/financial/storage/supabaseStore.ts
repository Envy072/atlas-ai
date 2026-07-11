import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { FundingStage } from "@/lib/financial/schemas/fundingStage.schema";
import type { FinancialKnowledgeStore } from "@/lib/financial/types/storage";

// ARCHITECTURE ONLY. A real implementation would back this with a
// Supabase table (via the existing, unmodified lib/supabase.ts client,
// which this milestone does not touch). Conforms to the same
// FinancialKnowledgeStore interface as memoryStore.ts, so switching the
// platform's default backend later is a one-line change in createStore.ts.
export class SupabaseFinancialStore implements FinancialKnowledgeStore {
  constructor(private readonly tableName: string = "financial_profiles") {}

  async getById(id: string): Promise<FinancialProfile | null> {
    void id;
    throw new Error(
      `SupabaseFinancialStore is architecture only — no "${this.tableName}" query is implemented yet.`
    );
  }

  async findByFundingStage(stage: FundingStage): Promise<FinancialProfile[]> {
    void stage;
    throw new Error("SupabaseFinancialStore.findByFundingStage is not implemented yet.");
  }

  async list(): Promise<FinancialProfile[]> {
    throw new Error("SupabaseFinancialStore.list is not implemented yet.");
  }

  async upsert(profile: FinancialProfile): Promise<void> {
    void profile;
    throw new Error("SupabaseFinancialStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseFinancialStore.delete is not implemented yet.");
  }
}
