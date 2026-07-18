import type { Evidence } from "@/lib/research";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import { InvestmentThesisSchema } from "@/lib/decision/schemas/thesis.schema";
import { parseOrThrow } from "@/lib/validation/parse";
import { verifyClaim, tallyClaimVerificationResults } from "@/lib/decision/traceability/claimVerifier";
import type { ClaimVerificationResult } from "@/lib/decision/traceability/claimVerifier";
import { generateCandidateThesisArguments } from "@/lib/services/openai";
import type { CandidateThesisArgument } from "@/lib/decision/schemas/candidateThesisArgument.schema";
import { dedupeByKey } from "@/lib/shared";

export interface BuildInvestmentThesisInput {
  positiveArguments?: string[];
  negativeArguments?: string[];
  unknowns?: string[];
  contradictions?: string[];
  supportingEvidence?: Evidence[];
}

// The one place a real InvestmentThesis gets constructed — construction
// only, for a future caller with real, evidenced arguments.
export function buildInvestmentThesis(input: BuildInvestmentThesisInput): InvestmentThesis {
  return parseOrThrow(
    InvestmentThesisSchema,
    {
      positiveArguments: input.positiveArguments ?? [],
      negativeArguments: input.negativeArguments ?? [],
      unknowns: input.unknowns ?? [],
      contradictions: input.contradictions ?? [],
      supportingEvidence: input.supportingEvidence ?? [],
    },
    "Failed to build a schema-valid InvestmentThesis."
  );
}

// ARCHITECTURE ONLY. NO AI GENERATION. NO CONCLUSIONS. Weighing real
// arguments on both sides of an investment decision requires judgment
// this platform doesn't perform — stays honestly empty until a future
// module supplies real, evidenced arguments.
export function deriveEmptyThesis(): InvestmentThesis {
  return {
    positiveArguments: [],
    negativeArguments: [],
    unknowns: [],
    contradictions: [],
    supportingEvidence: [],
  };
}

// Real generation, evidence-constrained end to end
// (MILESTONE_36_DESIGN.md Section 5) — the third of the four
// Checkpoint B generation functions. Unlike deriveFindings()/
// deriveCriticalRisks() (one verified claim → one real object), this
// treats each candidate argument like a miniature claim for
// verification purposes, then diverges only at aggregation: every
// "matched" argument's summary is bucketed into one of
// InvestmentThesis's four arrays by its own kind, and every "matched"
// argument's resolvedEvidence is unioned into one shared pool,
// deduplicated by Evidence.id via the already-existing dedupeByKey()
// (reused unmodified, not a new hand-rolled dedup routine). A
// candidate that fails verifyClaim() (Milestone 40 — traceability,
// unmodified, then relevance) is dropped entirely, never shown with a
// caveat (ATLAS_AI_V2_FINAL.md Section 5).
//
// Graceful degradation: a generation failure, or zero input evidence,
// degrades to deriveEmptyThesis()'s exact honest-empty shape — the
// shape-appropriate equivalent of deriveFindings()/deriveCriticalRisks()'s
// own [] degradation, for the same reasoning (a transient LLM hiccup
// must not fail the six-stage pipeline).
export async function deriveInvestmentThesis(
  startupIdea: string,
  evidence: Evidence[]
): Promise<InvestmentThesis> {
  if (evidence.length === 0) return deriveEmptyThesis();

  let candidates: CandidateThesisArgument[];
  try {
    candidates = await generateCandidateThesisArguments(startupIdea, evidence);
  } catch (error) {
    console.error("Investment thesis generation failed:", error);
    return deriveEmptyThesis();
  }

  const positiveArguments: string[] = [];
  const negativeArguments: string[] = [];
  const unknowns: string[] = [];
  const contradictions: string[] = [];
  const matchedEvidence: Evidence[] = [];
  const verifications: ClaimVerificationResult[] = [];

  for (const candidate of candidates) {
    const verification = await verifyClaim(candidate, evidence);
    verifications.push(verification);
    if (verification.status !== "matched") continue;

    switch (candidate.kind) {
      case "positive":
        positiveArguments.push(candidate.summary);
        break;
      case "negative":
        negativeArguments.push(candidate.summary);
        break;
      case "unknown":
        unknowns.push(candidate.summary);
        break;
      case "contradiction":
        contradictions.push(candidate.summary);
        break;
    }
    matchedEvidence.push(...verification.resolvedEvidence);
  }

  console.info("[claimVerification]", { facet: "investmentThesis", ...tallyClaimVerificationResults(verifications) });

  return buildInvestmentThesis({
    positiveArguments,
    negativeArguments,
    unknowns,
    contradictions,
    supportingEvidence: dedupeByKey(matchedEvidence, (item) => item.id),
  });
}
