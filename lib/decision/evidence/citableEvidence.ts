import type { Evidence } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import { dedupeByKey } from "@/lib/decision/utils/dedupeByKey";

// Restricted, already-verified citable-evidence pool — the union of
// evidence already cited by keyFindings, criticalRisks, and
// investmentThesis.supportingEvidence, deduplicated by id
// (MILESTONE_37_DESIGN.md Section 5, Option B). A recommendation or a
// verdict can only cite evidence some other already-verified facet
// already touched — a deliberate, stronger traceability guarantee than
// the raw aggregated pool Milestones 34-36 each use, accepted as an
// intentional trade-off: a real, non-fabricated recommendation or
// verdict citing evidence outside this pool is still rejected.
//
// Relocated here from recommendations/recommendationGenerator.ts at
// Milestone 38 (Minor Finding 3, Principal Architect Review): the
// original plan kept this function in recommendationGenerator.ts and
// had verdict/decisionVerdict.ts import it from there — a facet folder
// reaching into a sibling facet folder's own implementation file, a
// pattern with no other precedent in this platform (every other
// cross-facet reference is a type import from a schema file). This
// neutral location gives both recommendations/ and verdict/ a shared
// dependency instead of one owning it and the other borrowing from it.
// Zero change to the function's own body from its original Milestone
// 37 form.
export function computeCitableEvidence(
  findings: Finding[],
  criticalRisks: RiskFinding[],
  investmentThesis: InvestmentThesis
): Evidence[] {
  const allEvidence = [
    ...findings.flatMap((finding) => finding.evidence),
    ...criticalRisks.flatMap((risk) => risk.evidence),
    ...investmentThesis.supportingEvidence,
  ];
  return dedupeByKey(allEvidence, (item) => item.id);
}
