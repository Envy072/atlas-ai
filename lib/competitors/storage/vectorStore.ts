import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";

// ARCHITECTURE ONLY, FUTURE PROVIDER. A vector DB (pgvector, Pinecone,
// Weaviate — undecided) would let a future Market Intelligence module ask
// "which known companies are semantically similar to this new idea?"
// instead of only exact/normalized-name lookups. Implements the same
// CompetitorKnowledgeStore interface as every other backend so it's a
// drop-in swap via createStore.ts, plus one extra method
// (findSimilarByDescription) genuinely specific to a vector backend —
// callers that don't need semantic search keep depending on the base
// interface only.
export interface VectorCompetitorStore extends CompetitorKnowledgeStore {
  findSimilarByDescription(description: string, limit?: number): Promise<CompanyProfile[]>;
}

export class VectorDbCompetitorStore implements VectorCompetitorStore {
  constructor(private readonly collectionName: string = "competitor_profiles_embeddings") {}

  async getById(id: string): Promise<CompanyProfile | null> {
    void id;
    throw new Error(
      `VectorDbCompetitorStore is architecture only — no vector collection "${this.collectionName}" is connected yet.`
    );
  }

  async findByName(name: string): Promise<CompanyProfile | null> {
    void name;
    throw new Error("VectorDbCompetitorStore.findByName is not implemented yet.");
  }

  async list(): Promise<CompanyProfile[]> {
    throw new Error("VectorDbCompetitorStore.list is not implemented yet.");
  }

  async upsert(profile: CompanyProfile): Promise<void> {
    void profile;
    throw new Error("VectorDbCompetitorStore.upsert is not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("VectorDbCompetitorStore.delete is not implemented yet.");
  }

  async findSimilarByDescription(description: string, limit?: number): Promise<CompanyProfile[]> {
    void description;
    void limit;
    throw new Error("VectorDbCompetitorStore.findSimilarByDescription is not implemented yet.");
  }
}
