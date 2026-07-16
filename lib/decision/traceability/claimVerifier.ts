import type { Evidence } from "@/lib/research";
import type { CandidateClaim } from "@/lib/decision/schemas/candidateClaim.schema";

export type ClaimVerificationStatus = "matched" | "rejected";

export interface ClaimVerificationResult {
  status: ClaimVerificationStatus;
  resolvedEvidence: Evidence[];
  reason?: string;
}

// The traceability gate every future generation step (Milestone 34+)
// must pass a candidate claim through before it is ever allowed to
// become a real Finding/RiskFinding (MILESTONE_33_DESIGN.md Section 1).
// Pure, deterministic, zero I/O, zero LLM involvement.
//
// Fails closed on any unresolved citation (Section 7): a claim citing
// three ids where only two resolve is rejected in full, never
// "two-thirds accepted" — a claim with at least one fabricated
// citation is still a fabrication risk.
//
// Evidence-id comparison is exact string equality — case-sensitive, no
// trimming or normalization of any kind (Section 7) — Map's own native
// string-key lookup already gives this for free; no fuzzy-match helper
// is introduced.
//
// Takes the full CandidateClaim, not a bare citedEvidenceIds: string[],
// even though claim.summary is never read below — deliberate, not an
// oversight (MILESTONE_33_DESIGN.md Section 17, Finding 5). This keeps
// every call site framed as "is this claim traceable," and leaves room
// for a future, still-narrow refinement (e.g. a sanity check against
// claim.summary) to extend this function without a signature change
// anywhere it's called.
export function verifyClaimTraceability(
  claim: CandidateClaim,
  availableEvidence: Evidence[]
): ClaimVerificationResult {
  if (claim.citedEvidenceIds.length === 0) {
    return { status: "rejected", resolvedEvidence: [], reason: "No evidence cited." };
  }

  const evidenceById = new Map(availableEvidence.map((evidence) => [evidence.id, evidence]));
  const resolvedEvidence: Evidence[] = [];
  const seenIds = new Set<string>();

  for (const id of claim.citedEvidenceIds) {
    const match = evidenceById.get(id);

    if (!match) {
      return {
        status: "rejected",
        resolvedEvidence: [],
        reason: `Cited evidence id "${id}" does not resolve.`,
      };
    }

    // First-occurrence-wins, matching dedupeByKey's own convention
    // elsewhere in this module — a repeated citation isn't fabricated,
    // just redundant.
    if (!seenIds.has(id)) {
      seenIds.add(id);
      resolvedEvidence.push(match);
    }
  }

  return { status: "matched", resolvedEvidence };
}
