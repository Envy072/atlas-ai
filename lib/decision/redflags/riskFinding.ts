import type { Evidence } from "@/lib/research";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import { RiskFindingSchema } from "@/lib/decision/schemas/riskFinding.schema";
import type { FindingCategory, RedFlagSeverity } from "@/lib/decision/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";
import { verifyClaimTraceability } from "@/lib/decision/traceability/claimVerifier";
import { generateCandidateRisks } from "@/lib/services/openai";
import type { CandidateRisk } from "@/lib/decision/schemas/candidateRisk.schema";

let riskFindingIdCounter = 0;

function nextRiskFindingId(): string {
  riskFindingIdCounter += 1;
  return `redflag_${Date.now()}_${riskFindingIdCounter}`;
}

export interface BuildRiskFindingInput {
  category: FindingCategory;
  severity: RedFlagSeverity;
  summary: string;
  evidence: Evidence[];
  confidence: number;
}

// The one place a RiskFinding gets constructed. "Evidence-backed only"
// per this milestone's explicit rule — `evidence` is required here (not
// optional, unlike Finding's) and the schema itself enforces at least
// one entry, so a caller cannot accidentally construct an unsupported
// red flag.
export function buildRiskFinding(input: BuildRiskFindingInput): RiskFinding {
  return parseOrThrow(
    RiskFindingSchema,
    {
      id: nextRiskFindingId(),
      category: input.category,
      severity: input.severity,
      summary: input.summary,
      evidence: input.evidence,
      confidence: input.confidence,
    },
    "Failed to build a schema-valid RiskFinding."
  );
}

// Real generation, evidence-constrained end to end
// (MILESTONE_35_DESIGN.md Section 5) — the second of the four
// Checkpoint B generation functions, structurally identical to
// deriveFindings() (Milestone 34). Every candidate
// generateCandidateRisks() returns is checked by
// verifyClaimTraceability() (Milestone 33, unmodified) before it can
// ever become a real RiskFinding via buildRiskFinding() (unmodified) —
// a candidate that fails is dropped entirely, never shown with a
// caveat (ATLAS_AI_V2_FINAL.md Section 5). verification.resolvedEvidence
// is guaranteed non-empty for a "matched" result
// (MILESTONE_35_DESIGN.md Section 4.2), so it satisfies
// buildRiskFinding()'s required, non-optional `evidence` field with no
// length check needed.
//
// Graceful degradation: a generation failure is logged and degrades to
// [] rather than failing the entire six-stage pipeline over a
// transient LLM hiccup — the same reasoning deriveFindings() already
// applies to its own failed generation call.
export async function deriveCriticalRisks(startupIdea: string, evidence: Evidence[]): Promise<RiskFinding[]> {
  if (evidence.length === 0) return [];

  let candidates: CandidateRisk[];
  try {
    candidates = await generateCandidateRisks(startupIdea, evidence);
  } catch (error) {
    console.error("Critical risk generation failed:", error);
    return [];
  }

  const risks: RiskFinding[] = [];

  for (const candidate of candidates) {
    const verification = verifyClaimTraceability(candidate, evidence);
    if (verification.status !== "matched") continue;

    risks.push(
      buildRiskFinding({
        category: candidate.category,
        severity: candidate.severity,
        summary: candidate.summary,
        evidence: verification.resolvedEvidence,
        confidence: candidate.confidence,
      })
    );
  }

  return risks;
}
