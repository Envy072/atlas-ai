import { buildVerificationSummary } from "@/lib/verification";
import type { VerificationSummary } from "@/lib/verification";
import type { DecisionProfile } from "@/lib/decision";
import { buildDecisionProfileFixture } from "@/tests/fixtures/decisionProfileFixture";

// Reuses the real, production buildVerificationSummary(profile) —
// every VerificationSummary field is a direct pass-through or a simple
// count derived from a DecisionProfile, so there is no separate shape
// to hand-author here at all (MILESTONE_30_DESIGN.md Deliverable 4).
// buildVerificationSummary already validates its own output; nothing
// further to re-validate here.
export function buildVerificationSummaryFixture(
  profile: DecisionProfile = buildDecisionProfileFixture()
): VerificationSummary {
  return buildVerificationSummary(profile);
}
