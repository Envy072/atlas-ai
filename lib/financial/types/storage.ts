import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import type { FundingStage } from "@/lib/financial/schemas/fundingStage.schema";

// The one interface every knowledge-base backend implements — mirrors
// lib/competitors' CompetitorKnowledgeStore and lib/market's
// MarketKnowledgeStore exactly. `findByFundingStage` is the natural
// secondary index here (a FinancialProfile has no unique name/industry
// key of its own to look up by), returning every profile at that stage
// rather than a single match.
export interface FinancialKnowledgeStore {
  getById(id: string): Promise<FinancialProfile | null>;
  findByFundingStage(stage: FundingStage): Promise<FinancialProfile[]>;
  list(): Promise<FinancialProfile[]>;
  upsert(profile: FinancialProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
