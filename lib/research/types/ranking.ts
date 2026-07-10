// RankingFactors and RankedSource are Zod-validated data shapes (they
// cross the orchestrator → ResearchResult boundary), so they live in
// schemas/ranking.schema.ts, not here — import them from
// "@/lib/research/schemas" directly. This file only holds the one
// ranking-related type that isn't a validated data shape.

// What a scorer needs beyond the source itself, so factors like
// "relevance" have something to compare against. Not a validated data
// shape (never crosses a schema boundary), so it stays a plain type here.
export interface RankingContext {
  topic: string;
}
