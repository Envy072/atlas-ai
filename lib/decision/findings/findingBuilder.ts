import type { Evidence } from "@/lib/research";
import type { Severity } from "@/lib/market";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";
import type { FindingCategory } from "@/lib/decision/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";
import { verifyClaim, tallyClaimVerificationResults } from "@/lib/decision/traceability/claimVerifier";
import type { ClaimVerificationResult } from "@/lib/decision/traceability/claimVerifier";
import { generateCandidateFindings } from "@/lib/services/openai";
import type { CandidateFinding } from "@/lib/decision/schemas/candidateFinding.schema";

let findingIdCounter = 0;

function nextFindingId(): string {
  findingIdCounter += 1;
  return `finding_${Date.now()}_${findingIdCounter}`;
}

export interface BuildFindingInput {
  category: FindingCategory;
  severity: Severity;
  summary: string;
  evidence?: Evidence[];
  confidence: number;
}

// The one place a Finding gets constructed — construction only, for a
// future caller with a real, evidenced observation.
export function buildFinding(input: BuildFindingInput): Finding {
  return parseOrThrow(
    FindingSchema,
    {
      id: nextFindingId(),
      category: input.category,
      severity: input.severity,
      summary: input.summary,
      evidence: input.evidence ?? [],
      confidence: input.confidence,
    },
    "Failed to build a schema-valid Finding."
  );
}

// Real generation, evidence-constrained end to end
// (MILESTONE_34_DESIGN.md Section 5). Every candidate
// generateCandidateFindings() returns is checked by verifyClaim()
// (Milestone 40 — traceability, unmodified, then relevance) before it
// can ever become a real Finding via buildFinding() (unmodified since
// Milestone 10) — a candidate that fails either gate is dropped
// entirely, never shown with a caveat (ATLAS_AI_V2_FINAL.md Section 5).
//
// Graceful degradation: a generation failure is logged and degrades to
// [] rather than failing the entire six-stage pipeline over a
// transient LLM hiccup — the same reasoning
// persistProjectFromSession() already applies to a failed database
// write, applied here to a failed generation call.
export async function deriveFindings(startupIdea: string, evidence: Evidence[]): Promise<Finding[]> {
  if (evidence.length === 0) return [];

  let candidates: CandidateFinding[];
  try {
    candidates = await generateCandidateFindings(startupIdea, evidence);
  } catch (error) {
    console.error("Finding generation failed:", error);
    return [];
  }

  const findings: Finding[] = [];
  const verifications: ClaimVerificationResult[] = [];

  for (const candidate of candidates) {
    const verification = await verifyClaim(candidate, evidence);
    verifications.push(verification);
    if (verification.status !== "matched") continue;

    findings.push(
      buildFinding({
        category: candidate.category,
        severity: candidate.severity,
        summary: candidate.summary,
        evidence: verification.resolvedEvidence,
        confidence: candidate.confidence,
      })
    );
  }

  console.info("[claimVerification]", { facet: "findings", ...tallyClaimVerificationResults(verifications) });

  return findings;
}
