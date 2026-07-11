import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { DecisionKnowledgeStore } from "@/lib/decision/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like the other four platforms' memory stores.
export class MemoryDecisionStore implements DecisionKnowledgeStore {
  private readonly byId = new Map<string, DecisionProfile>();

  async getById(id: string): Promise<DecisionProfile | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<DecisionProfile[]> {
    return Array.from(this.byId.values());
  }

  async upsert(profile: DecisionProfile): Promise<void> {
    this.byId.set(profile.id, profile);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
