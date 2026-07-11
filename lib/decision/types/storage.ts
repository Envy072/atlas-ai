import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";

// The one interface every knowledge-base backend implements — mirrors
// the other four platforms' own store interfaces. `getById`/`list`/
// `upsert`/`delete` only; unlike the other platforms, a DecisionProfile
// has no natural shared-categorical secondary key of its own (funding
// stage and health rating both live one layer down, on the
// Financial/Business profiles it references) — so this interface
// deliberately doesn't add a `findByX` that would just be a duplicate
// lookup of that lower layer's own store.
export interface DecisionKnowledgeStore {
  getById(id: string): Promise<DecisionProfile | null>;
  list(): Promise<DecisionProfile[]>;
  upsert(profile: DecisionProfile): Promise<void>;
  delete(id: string): Promise<void>;
}
