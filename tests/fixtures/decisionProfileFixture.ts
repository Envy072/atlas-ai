import { buildMarketProfile } from "@/lib/market";
import { buildFinancialProfile } from "@/lib/financial";
import { buildBusinessProfile } from "@/lib/business";
import { buildDecisionProfile, DecisionProfileSchema } from "@/lib/decision";
import type { DecisionProfile } from "@/lib/decision";
import { parseOrThrow } from "@/lib/validation/parse";

// Composes the exact, real, production builder functions every
// knowledge platform already exposes for this purpose
// (buildMarketProfile/buildFinancialProfile/buildBusinessProfile/
// buildDecisionProfile — each pure and synchronous, no network calls)
// rather than hand-authoring DecisionProfile's large, deeply-nested
// shape field by field. This guarantees the fixture is schema-valid by
// construction, via the same code path production uses, not a second,
// competing approximation of it (MILESTONE_30_DESIGN.md Deliverable
// 4).
//
// overrides is re-validated through DecisionProfileSchema before
// returning — an override that produces an invalid DecisionProfile
// fails loudly here, at the fixture call site, rather than surfacing
// as a confusing failure somewhere else in a test that imports it.
export function buildDecisionProfileFixture(overrides: Partial<DecisionProfile> = {}): DecisionProfile {
  const marketProfile = buildMarketProfile({ industry: "software", confidence: 0 });
  const financialProfile = buildFinancialProfile({ confidence: 0 });
  const businessProfile = buildBusinessProfile({ confidence: 0 });

  const profile = buildDecisionProfile({
    decisionContext: { startupIdea: "A fixture startup idea for testing." },
    businessSummary: { overallHealth: businessProfile.overallHealth },
    marketProfile,
    financialProfile,
    businessProfile,
  });

  return parseOrThrow(
    DecisionProfileSchema,
    { ...profile, ...overrides },
    "buildDecisionProfileFixture produced an invalid DecisionProfile."
  );
}
