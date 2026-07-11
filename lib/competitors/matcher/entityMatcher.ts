import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompanyMatchResult } from "@/lib/competitors/schemas/matching.schema";
import { CompanyMatchResultSchema } from "@/lib/competitors/schemas/matching.schema";
import type { EntityMatchOptions } from "@/lib/competitors/types/matching";
import { normalizeCompanyName, tokenizeCompanyName } from "@/lib/competitors/utils/companyNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

// ARCHITECTURE, NO ML — deterministic normalization plus a token-overlap
// heuristic, never an embedding/similarity model. Two passes:
//   1. Exact match on the normalized name ("HubSpot Inc." -> "hubspot" ==
//      "Hub Spot" -> "hub spot"? no — see step 2) catches legal-suffix and
//      casing/punctuation differences outright.
//   2. Jaccard token overlap catches spacing/word-order differences
//      ("Hub Spot" vs "HubSpot" tokenize to {"hub","spot"} vs {"hubspot"} —
//      see the dedicated collapsed-form check below for that exact case).
// A future ML-based resolver can replace this function's body wholesale;
// every caller already depends only on its (name, candidates) ->
// CompanyMatchResult contract.
const DEFAULT_MATCH_THRESHOLD = 80;

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 100;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

// Collapsed form drops all whitespace after normalization, so "hub spot"
// and "hubspot" both become "hubspot" — the one spacing variant token
// overlap alone can't see (their token sets share zero tokens).
function collapsedForm(name: string): string {
  return normalizeCompanyName(name).replace(/\s+/g, "");
}

function scoreCandidate(candidateName: string, existingName: string): number {
  const normalizedCandidate = normalizeCompanyName(candidateName);
  const normalizedExisting = normalizeCompanyName(existingName);

  if (normalizedCandidate === normalizedExisting) return 100;
  if (collapsedForm(candidateName) === collapsedForm(existingName)) return 100;

  return jaccardSimilarity(tokenizeCompanyName(candidateName), tokenizeCompanyName(existingName));
}

// Compares one candidate name against every known profile (typically the
// current knowledge-base contents, via CompetitorKnowledgeStore.list()) and
// returns the single best match, if any clears the threshold.
export function matchCompanyName(
  candidateName: string,
  existingProfiles: CompanyProfile[],
  options: EntityMatchOptions = {}
): CompanyMatchResult {
  const threshold = options.matchThreshold ?? DEFAULT_MATCH_THRESHOLD;

  let bestScore = 0;
  let bestProfile: CompanyProfile | null = null;

  for (const profile of existingProfiles) {
    const candidateNames = [profile.name, ...profile.aliases];

    for (const name of candidateNames) {
      const score = scoreCandidate(candidateName, name);
      if (score > bestScore) {
        bestScore = score;
        bestProfile = profile;
      }
    }
  }

  const matched = bestProfile !== null && bestScore >= threshold;

  return parseOrThrow(
    CompanyMatchResultSchema,
    {
      matched,
      confidence: bestScore,
      matchedCompanyId: matched ? (bestProfile as CompanyProfile).id : undefined,
      reason: matched
        ? `"${candidateName}" normalizes to the same entity as "${(bestProfile as CompanyProfile).name}".`
        : bestProfile
          ? `Best candidate "${bestProfile.name}" scored ${bestScore}, below the ${threshold} match threshold.`
          : "No existing profiles to compare against.",
    },
    "Failed to build a schema-valid CompanyMatchResult."
  );
}
