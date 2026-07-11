import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { DecisionKnowledgeStore } from "@/lib/decision/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. A knowledge warehouse would let a
// future Investor Reports/Reports/Dashboard module run aggregate queries
// across every decision synthesized ("average evidence confidence across
// all fintech decisions this quarter") instead of only per-decision
// lookups. Implements the same DecisionKnowledgeStore interface as every
// other backend so it's a drop-in swap via createStore.ts, plus one
// extra method (aggregateConfidence) genuinely specific to a warehouse
// backend.
export interface WarehouseDecisionStore extends DecisionKnowledgeStore {
  aggregateConfidence(): Promise<{ profileCount: number; averageEvidenceConfidence: number }>;
}

export class KnowledgeWarehouseDecisionStore implements WarehouseDecisionStore {
  constructor(private readonly datasetName: string = "decision_profiles_warehouse") {}

  async getById(id: string): Promise<DecisionProfile | null> {
    void id;
    throw new Error(
      `KnowledgeWarehouseDecisionStore is architecture only — no warehouse dataset "${this.datasetName}" is connected yet.`
    );
  }

  async list(): Promise<DecisionProfile[]> {
    throw new Error("KnowledgeWarehouseDecisionStore.list is not implemented yet.");
  }

  async upsert(profile: DecisionProfile): Promise<void> {
    void profile;
    throw new Error("KnowledgeWarehouseDecisionStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("KnowledgeWarehouseDecisionStore.delete is not implemented yet.");
  }

  async aggregateConfidence(): Promise<{ profileCount: number; averageEvidenceConfidence: number }> {
    throw new Error("KnowledgeWarehouseDecisionStore.aggregateConfidence is not implemented yet.");
  }
}
