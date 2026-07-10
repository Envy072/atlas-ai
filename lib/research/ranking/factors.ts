import type { Source } from "@/lib/research/schemas/source.schema";
import type { RankingContext } from "@/lib/research/types/ranking";

// ARCHITECTURE ONLY — every function below returns a fixed, neutral
// placeholder (50/100), not a real score. This is deliberate per this
// milestone's scope ("design scoring... no implementation of algorithms
// yet"), and it is honest rather than fake because nothing consumes
// these numbers as real signal yet: no provider returns real sources, so
// rankSources() always ranks an empty list, and these functions are
// unreachable with real data until a provider is implemented (Milestone
// 4 Phase 2+).
//
// Each function's signature is the real, permanent contract — a future
// implementation replaces only the function body:
//   - scoreAuthority: domain-authority lookup / known-publisher list
//   - scoreFreshness: decay curve over lib/research/utils/rankingPreparation's
//     getSourceAgeInDays
//   - scoreRelevance: likely built on rankingPreparation's
//     getTopicOverlapRatio, or a real embedding-similarity model
//   - scoreTrust: source-type + domain reputation weighting
//   - scoreSourceQuality: content depth/length/structure heuristics

const PLACEHOLDER_SCORE = 50;

export function scoreAuthority(source: Source, context: RankingContext): number {
  void source;
  void context;
  return PLACEHOLDER_SCORE;
}

export function scoreFreshness(source: Source, context: RankingContext): number {
  void source;
  void context;
  return PLACEHOLDER_SCORE;
}

export function scoreRelevance(source: Source, context: RankingContext): number {
  void source;
  void context;
  return PLACEHOLDER_SCORE;
}

export function scoreTrust(source: Source, context: RankingContext): number {
  void source;
  void context;
  return PLACEHOLDER_SCORE;
}

export function scoreSourceQuality(source: Source, context: RankingContext): number {
  void source;
  void context;
  return PLACEHOLDER_SCORE;
}
