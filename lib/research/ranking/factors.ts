import type { Source } from "@/lib/research/schemas/source.schema";
import type { RankingContext } from "@/lib/research/types/ranking";
import { getSourceAgeInDays, getTopicOverlapRatio } from "@/lib/research/utils/rankingPreparation";

// ARCHITECTURE ONLY (scoreAuthority/scoreTrust/scoreSourceQuality) —
// each still returns a fixed, neutral placeholder (50/100), deliberately
// deferred: a real implementation needs a domain-authority/reputation
// data source this milestone doesn't introduce. scoreFreshness and
// scoreRelevance are real as of this milestone (Milestone 99) — see each
// function's own comment below.
//
// Each function's signature is the real, permanent contract — a future
// implementation replaces only the function body:
//   - scoreAuthority: domain-authority lookup / known-publisher list
//   - scoreTrust: source-type + domain reputation weighting
//   - scoreSourceQuality: content depth/length/structure heuristics

const PLACEHOLDER_SCORE = 50;

// A 180-day exponential decay constant: score = 100 at publication,
// ~37 at 180 days old, ~14 at 360 days old, asymptotically approaching
// (never reaching) 0 — a smoothly realistic curve rather than linear
// decay's abrupt cutoff, per this milestone's explicit design decision.
// Deterministic, pure, monotonic (strictly decreasing in ageDays), and
// naturally bounded to (0, 100] with no separate clamp needed, since
// getSourceAgeInDays() already floors ageDays at 0 and exp(x) for x <= 0
// is always in (0, 1].
const FRESHNESS_DECAY_CONSTANT_DAYS = 180;

function scoreFreshnessFromAge(ageDays: number): number {
  return Math.round(100 * Math.exp(-ageDays / FRESHNESS_DECAY_CONSTANT_DAYS));
}

export function scoreAuthority(source: Source, context: RankingContext): number {
  void source;
  void context;
  return PLACEHOLDER_SCORE;
}

// Real as of Milestone 99: an exponential decay over the source's own
// age (rankingPreparation.ts's getSourceAgeInDays). A source with no
// publishedAt returns null age — scored as the same neutral placeholder
// every not-yet-implemented factor uses, an honest "unknown," never a
// fabricated guess at how fresh an undated source might be.
export function scoreFreshness(source: Source, context: RankingContext): number {
  void context;
  const ageDays = getSourceAgeInDays(source);
  if (ageDays === null) return PLACEHOLDER_SCORE;
  return scoreFreshnessFromAge(ageDays);
}

// Real as of Milestone 99: rankingPreparation.ts's getTopicOverlapRatio
// (a 0-1 token-overlap ratio) scaled to this function's own 0-100
// contract — no other new logic.
export function scoreRelevance(source: Source, context: RankingContext): number {
  return Math.round(getTopicOverlapRatio(context.topic, source) * 100);
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
