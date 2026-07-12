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
export async function resolveCompetitorKnowledge(
  candidates: DiscoveredCompetitor[],
  store: CompetitorKnowledgeStore = defaultCompetitorStore
): Promise<CompanyProfile[]> {
  const storedProfiles = await store.list();
  const resolvedById = new Map<string, CompanyProfile>();

  // Every candidate is matched against the store's contents PLUS every
  // profile already resolved earlier in THIS batch (with a
  // store-provided entry dropped once a fresher, resolved-this-batch
  // version of the same company exists) — so two candidates in one
  // discovery run that are the same company (a grouping miss
  // candidateExtraction.ts's own simpler name+domain grouping didn't
  // catch) resolve through the exact same matcher as a cross-run
  // duplicate would, with no special-cased branch for "same batch" vs.
  // "earlier run".
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
      : buildCompanyProfile({
          name: candidate.candidateName,
          website: candidate.website,
          sources: candidate.sources,
          evidence: candidate.evidence,
          confidence: candidate.confidence,
        });

    await store.upsert(profile);
    resolvedById.set(profile.id, profile);
  }

  return Array.from(resolvedById.values());
}
