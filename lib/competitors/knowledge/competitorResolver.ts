import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { DiscoveredCompetitor } from "@/lib/competitors/schemas/discovery.schema";
import type { CompetitorKnowledgeStore } from "@/lib/competitors/types/storage";
import { matchCompanyName } from "@/lib/competitors/matcher/entityMatcher";
import { buildCompanyProfile } from "@/lib/competitors/knowledge/companyProfileBuilder";
import { mergeCompanyProfile } from "@/lib/competitors/knowledge/profileMerger";
import { defaultCompetitorStore } from "@/lib/competitors/storage/defaultStore";

// "The caller's job" COMPETITOR_PLATFORM.md always said discovery itself
// never does (MILESTONE_16_DESIGN.md's "Why Existing Architecture Wasn't
// Used") — the first real caller. Composes three already-real functions
// (matchCompanyName, buildCompanyProfile, mergeCompanyProfile) plus the
// store interface; introduces no new matching or profile-building logic
// of its own. Its one genuine piece of new logic is batch-aware
// deduplication (see below) — the correctness property Section 5/
// Complexity Review of the design justified this function's existence on.
//
// Milestone 116 — every lookup is scoped to `analysisId`, the owning
// analysis's own pipeline execution id. The original design
// (MILESTONE_16_DESIGN.md) matched a candidate against every company
// ever discovered by any analysis, globally — durable accumulation
// *across* analyses was the explicit intent at the time, written before
// Authentication (Milestone 27) gave this codebase any concept of
// per-analysis identity to scope by. Left unscoped, two completely
// unrelated analyses could fuzzy-match onto the same stored company
// (most visibly for generic, low-confidence candidate names — Milestone
// 114's Critical Finding #1, directly reproduced live). This resolver
// now only ever matches a candidate against companies already resolved
// within this SAME analysis (relevant for a retried decision stage),
// never another analysis's — durable cross-analysis accumulation is
// retired, not preserved with a smaller blast radius.
export async function resolveCompetitorKnowledge(
  candidates: DiscoveredCompetitor[],
  analysisId: string,
  store: CompetitorKnowledgeStore = defaultCompetitorStore
): Promise<CompanyProfile[]> {
  const storedProfiles = await store.list(analysisId);
  const resolvedById = new Map<string, CompanyProfile>();

  // Every candidate is matched against the store's contents PLUS every
  // profile already resolved earlier in THIS batch (with a
  // store-provided entry dropped once a fresher, resolved-this-batch
  // version of the same company exists) — so two candidates in one
  // discovery run that are the same company (a grouping miss
  // candidateExtraction.ts's own simpler name+domain grouping didn't
  // catch) resolve through the exact same matcher as a cross-run
  // duplicate would, with no special-cased branch for "same batch" vs.
  // "earlier run". Both sources are already scoped to this analysisId —
  // storedProfiles via store.list(analysisId) above.
  function knownProfilesSoFar(): CompanyProfile[] {
    const resolvedIds = new Set(resolvedById.keys());
    return [...storedProfiles.filter((profile) => !resolvedIds.has(profile.id)), ...resolvedById.values()];
  }

  for (const candidate of candidates) {
    const known = knownProfilesSoFar();
    const matchResult = matchCompanyName(candidate.candidateName, known);

    const matchedProfile = matchResult.matched
      ? known.find((existing) => existing.id === matchResult.matchedCompanyId)
      : undefined;

    const profile = matchedProfile
      ? mergeCompanyProfile(matchedProfile, {
          // The candidate's own name is a real, evidence-backed name
          // variant for this company (that's what triggered the match)
          // — recorded as an alias when it isn't already the profile's
          // own name or a known alias, so the alias list genuinely grows
          // with every real name variant discovered, the same "aliases
          // grows every time the matcher/merger folds in a new name
          // variant" behavior COMPETITOR_PLATFORM.md always documented.
          aliases:
            candidate.candidateName !== matchedProfile.name && !matchedProfile.aliases.includes(candidate.candidateName)
              ? [candidate.candidateName]
              : [],
          website: candidate.website,
          sources: candidate.sources,
          evidence: candidate.evidence,
          confidence: candidate.confidence,
        })
      : { ...buildCompanyProfile({
          name: candidate.candidateName,
          website: candidate.website,
          sources: candidate.sources,
          evidence: candidate.evidence,
          confidence: candidate.confidence,
        }), analysisId };

    await store.upsert(profile);
    resolvedById.set(profile.id, profile);
  }

  return Array.from(resolvedById.values());
}
