import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { FundingStage } from "@/lib/financial/schemas/fundingStage.schema";
import type { FinancialKnowledgeStore } from "@/lib/financial/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. An analytical warehouse (BigQuery,
// Snowflake, ClickHouse — undecided) would let a future Reports/Dashboard
// module run aggregate queries across every known financial profile
// ("median CAC across all seed-stage fintech startups") instead of only
// per-profile lookups. Implements the same FinancialKnowledgeStore
// interface as every other backend so it's a drop-in swap via
// createStore.ts, plus one extra method (aggregateByFundingStage)
// genuinely specific to a warehouse backend.
export interface WarehouseFinancialStore extends FinancialKnowledgeStore {
  aggregateByFundingStage(
    stage: FundingStage
  ): Promise<{ profileCount: number; averageConfidence: number }>;
}

export class AnalyticalWarehouseFinancialStore implements WarehouseFinancialStore {
  constructor(private readonly datasetName: string = "financial_profiles_warehouse") {}

  async getById(id: string): Promise<FinancialProfile | null> {
    void id;
    throw new Error(
      `AnalyticalWarehouseFinancialStore is architecture only — no warehouse dataset "${this.datasetName}" is connected yet.`
    );
  }

  async findByFundingStage(stage: FundingStage): Promise<FinancialProfile[]> {
    void stage;
    throw new Error("AnalyticalWarehouseFinancialStore.findByFundingStage is not implemented yet.");
  }

  async list(): Promise<FinancialProfile[]> {
    throw new Error("AnalyticalWarehouseFinancialStore.list is not implemented yet.");
  }

  async upsert(profile: FinancialProfile): Promise<void> {
    void profile;
    throw new Error("AnalyticalWarehouseFinancialStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("AnalyticalWarehouseFinancialStore.delete is not implemented yet.");
  }

  async aggregateByFundingStage(
    stage: FundingStage
  ): Promise<{ profileCount: number; averageConfidence: number }> {
    void stage;
    throw new Error("AnalyticalWarehouseFinancialStore.aggregateByFundingStage is not implemented yet.");
  }
}
