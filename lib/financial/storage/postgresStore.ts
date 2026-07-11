import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { FundingStage } from "@/lib/financial/schemas/fundingStage.schema";
import type { FinancialKnowledgeStore } from "@/lib/financial/types/storage";

// ARCHITECTURE ONLY. For a future deployment running its own Postgres
// instance directly (bypassing Supabase's client) — e.g. a dedicated read
// replica for heavy cross-profile analytical queries. No `pg`/`postgres`
// dependency exists in this project yet.
export class PostgresFinancialStore implements FinancialKnowledgeStore {
  constructor(private readonly connectionString: string) {}

  async getById(id: string): Promise<FinancialProfile | null> {
    void id;
    throw new Error(
      `PostgresFinancialStore is architecture only — no connection is established yet (would target ${this.connectionString}).`
    );
  }

  async findByFundingStage(stage: FundingStage): Promise<FinancialProfile[]> {
    void stage;
    throw new Error("PostgresFinancialStore.findByFundingStage is not implemented yet.");
  }

  async list(): Promise<FinancialProfile[]> {
    throw new Error("PostgresFinancialStore.list is not implemented yet.");
  }

  async upsert(profile: FinancialProfile): Promise<void> {
    void profile;
    throw new Error("PostgresFinancialStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("PostgresFinancialStore.delete is not implemented yet.");
  }
}
