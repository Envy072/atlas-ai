import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";

// A genuinely working store — no external dependency needed for an
// in-process Map, exactly like lib/research/cache/memoryCache.ts. Suitable
// for local development and single-instance deploys; see
// supabaseStore.ts/postgresStore.ts/vectorStore.ts for the durable,
// multi-instance story.
export class MemoryCompetitorStore implements CompetitorKnowledgeStore {
  private readonly byId = new Map<string, CompanyProfile>();

  async getById(id: string): Promise<CompanyProfile | null> {
    return this.byId.get(id) ?? null;
  }

  async findByName(name: string): Promise<CompanyProfile | null> {
    const normalized = name.trim().toLowerCase();

    for (const profile of this.byId.values()) {
      const names = [profile.name, ...profile.aliases].map((value) => value.trim().toLowerCase());
      if (names.includes(normalized)) return profile;
    }

    return null;
  }

  async list(): Promise<CompanyProfile[]> {
    return Array.from(this.byId.values());
  }

  async upsert(profile: CompanyProfile): Promise<void> {
    this.byId.set(profile.id, profile);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
