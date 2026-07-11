import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { FundingStage } from "@/lib/financial/schemas/fundingStage.schema";
import type { FinancialKnowledgeStore } from "@/lib/financial/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like MemoryCompetitorStore/MemoryMarketStore.
// Suitable for local development and single-instance deploys; see
// supabaseStore.ts/postgresStore.ts/warehouseStore.ts for the durable,
// multi-instance story.
export class MemoryFinancialStore implements FinancialKnowledgeStore {
  private readonly byId = new Map<string, FinancialProfile>();

  async getById(id: string): Promise<FinancialProfile | null> {
    return this.byId.get(id) ?? null;
  }

  async findByFundingStage(stage: FundingStage): Promise<FinancialProfile[]> {
    return Array.from(this.byId.values()).filter((profile) => profile.fundingStage === stage);
  }

  async list(): Promise<FinancialProfile[]> {
    return Array.from(this.byId.values());
  }

  async upsert(profile: FinancialProfile): Promise<void> {
    this.byId.set(profile.id, profile);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
