import type { Source } from "@/lib/research/schemas/source.schema";
import type { RankedSource, RankingFactors } from "@/lib/research/schemas/ranking.schema";
import type { RankingContext } from "@/lib/research/types/ranking";
import {
  scoreAuthority,
  scoreFreshness,
  scoreRelevance,
  scoreTrust,
  scoreSourceQuality,
} from "@/lib/research/ranking/factors";

// How much each factor contributes to the total score — a weight (0-1),
// not itself a 0-100 score, so this borrows RankingFactors' key set
// without its value constraints.
type FactorWeights = Record<keyof RankingFactors, number>;

// Real, adjustable architecture (a product/weighting decision) —
// independent of whether the factor functions themselves are real yet
// (they aren't; see factors.ts). Sums to 1 so the total score stays on
// the same 0-100 scale as each factor.
const FACTOR_WEIGHTS: FactorWeights = {
  relevance: 0.3,
  trust: 0.25,
  authority: 0.2,
  freshness: 0.15,
  sourceQuality: 0.1,
};

function scoreSource(source: Source, context: RankingContext): RankedSource {
  const factors: RankingFactors = {
    authority: scoreAuthority(source, context),
    freshness: scoreFreshness(source, context),
    relevance: scoreRelevance(source, context),
    trust: scoreTrust(source, context),
    sourceQuality: scoreSourceQuality(source, context),
  };

  const score =
    factors.authority * FACTOR_WEIGHTS.authority +
    factors.freshness * FACTOR_WEIGHTS.freshness +
    factors.relevance * FACTOR_WEIGHTS.relevance +
    factors.trust * FACTOR_WEIGHTS.trust +
    factors.sourceQuality * FACTOR_WEIGHTS.sourceQuality;

  return { ...source, score: Math.round(score), factors };
}

// Scores and sorts every source, highest score first. Fully functional
// composition/sorting logic today — only the individual factor scores
// feeding into it are placeholders (see factors.ts), so with an empty
// `sources` array (true until a provider is implemented) this correctly
// returns `[]`, and once real sources exist this needs no changes beyond
// factors.ts itself.
export function rankSources(sources: Source[], context: RankingContext): RankedSource[] {
  return sources.map((source) => scoreSource(source, context)).sort((a, b) => b.score - a.score);
}
