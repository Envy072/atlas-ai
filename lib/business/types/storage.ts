import type { BusinessProfile } from "@/lib/business/schemas/business.schema";
import type { BusinessHealthRating } from "@/lib/business/schemas/enums";

// The one interface every knowledge-base backend implements — mirrors
// lib/competitors'/lib/market's/lib/financial's own store interfaces.
// `findByHealthRating` is the natural secondary index here (a
// BusinessProfile has no unique name/industry key of its own), returning
// every profile at that rating.
export interface BusinessKnowledgeStore {
  getById(id: string): Promise<BusinessProfile | null>;
  findByHealthRating(rating: BusinessHealthRating): Promise<BusinessProfile[]>;
  list(): Promise<BusinessProfile[]>;
  upsert(profile: BusinessProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
