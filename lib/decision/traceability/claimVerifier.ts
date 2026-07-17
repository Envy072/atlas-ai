import type { Evidence } from "@/lib/research";
import type { CandidateClaim } from "@/lib/decision/schemas/candidateClaim.schema";
import { keywordOverlapStrategy } from "@/lib/decision/traceability/relevanceStrategies/keywordOverlapStrategy";

export type ClaimVerificationStatus = "matched" | "rejected";

// Structured rejection vocabulary (Milestone 40) — makes a rejection
// analyzable (debugging, and the tally below) beyond the free-text
// `reason` string already returned. EMPTY_CITATIONS/TRACEABILITY_FAILED
// are verifyClaimTraceability()'s own two rejection paths, unchanged in
// meaning, merely now labeled. RELEVANCE_FAILED is the strategy-agnostic
// fallback any current or future RelevanceStrategy can return without
// inventing its own vocabulary; EMPTY_SIGNIFICANT_TOKENS/
// LOW_RELEVANCE_SCORE are the two specific codes today's
// keywordOverlapStrategy produces. A new strategy is free to introduce
// its own additional codes (e.g. an LLM-judge strategy) — this union is
// additive, not closed.
export type ClaimRejectionReasonCode =
  | "EMPTY_CITATIONS"
  | "TRACEABILITY_FAILED"
  | "RELEVANCE_FAILED"
  | "EMPTY_SIGNIFICANT_TOKENS"
  | "LOW_RELEVANCE_SCORE";

export interface ClaimVerificationResult {
  status: ClaimVerificationStatus;
  resolvedEvidence: Evidence[];
  reasonCode?: ClaimRejectionReasonCode;
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
    return { status: "rejected", resolvedEvidence: [], reasonCode: "EMPTY_CITATIONS", reason: "No evidence cited." };
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
        reasonCode: "TRACEABILITY_FAILED",
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

// The outcome a RelevanceStrategy reports — deliberately NOT a
// ClaimVerificationResult. A strategy answers exactly one question ("is
// this claim relevant to this evidence, and if not, why"); it has no
// business constructing the shared result shape (which resolvedEvidence
// to return, which status) — that responsibility stays solely with
// verifyClaim() below, so every strategy implementation (today's
// keyword-overlap heuristic, a future embedding or LLM-based one) is as
// small and swappable as possible.
export interface RelevanceOutcome {
  isRelevant: boolean;
  reasonCode: ClaimRejectionReasonCode | null;
}

// The swappable seam (Milestone 40). `async` from day one — even though
// today's keywordOverlapStrategy needs no I/O — specifically so that a
// future embedding-similarity or LLM-judge strategy (both inherently
// asynchronous) can replace it later with zero signature change here and
// zero change at any of verifyClaim()'s five call sites. Only
// resolvedEvidence (already traceability-verified) is passed, never the
// full availableEvidence pool — a strategy judges relevance against what
// was actually cited, not against evidence the claim never referenced.
export type RelevanceStrategy = (claim: CandidateClaim, resolvedEvidence: Evidence[]) => Promise<RelevanceOutcome>;

// Applies a RelevanceStrategy and returns its outcome directly — no
// ClaimVerificationResult construction here (that's verifyClaim()'s job
// alone, per the explicit separation of responsibilities this milestone
// settled on). The default parameter is the only place today's
// keywordOverlapStrategy is wired in; swapping strategies later means
// changing this one default, not any caller.
export async function verifyClaimRelevance(
  claim: CandidateClaim,
  resolvedEvidence: Evidence[],
  strategy: RelevanceStrategy = keywordOverlapStrategy
): Promise<RelevanceOutcome> {
  return strategy(claim, resolvedEvidence);
}

// The single entry point every real caller (the five Checkpoint B/C
// facet builders) uses from Milestone 40 onward, replacing their direct
// calls to verifyClaimTraceability() one-for-one. Composes the two gates
// in sequence — traceability (unchanged, sync) first, relevance (async)
// only attempted once traceability has already matched — and is the one
// place a ClaimVerificationResult is ever constructed from a
// RelevanceOutcome. Fails closed exactly like verifyClaimTraceability()
// itself: a relevance rejection returns resolvedEvidence: [], never a
// partial acceptance.
//
// relevanceStrategy is an optional override solely for tests to inject a
// fake strategy and exercise this function's own composition/
// short-circuit logic independent of keywordOverlapStrategy's real
// behavior — no real call site ever passes it.
export async function verifyClaim(
  claim: CandidateClaim,
  availableEvidence: Evidence[],
  relevanceStrategy?: RelevanceStrategy
): Promise<ClaimVerificationResult> {
  const traceabilityResult = verifyClaimTraceability(claim, availableEvidence);
  if (traceabilityResult.status !== "matched") {
    return traceabilityResult;
  }

  const relevanceOutcome = await verifyClaimRelevance(claim, traceabilityResult.resolvedEvidence, relevanceStrategy);
  if (!relevanceOutcome.isRelevant) {
    return {
      status: "rejected",
      resolvedEvidence: [],
      reasonCode: relevanceOutcome.reasonCode ?? "RELEVANCE_FAILED",
      reason: "Cited evidence does not appear relevant to this claim.",
    };
  }

  return { status: "matched", resolvedEvidence: traceabilityResult.resolvedEvidence };
}

export interface ClaimVerificationTally {
  claimsEvaluated: number;
  accepted: number;
  rejectedByTraceability: number;
  rejectedByRelevance: number;
}

const TRACEABILITY_REASON_CODES: ReadonlySet<ClaimRejectionReasonCode> = new Set([
  "EMPTY_CITATIONS",
  "TRACEABILITY_FAILED",
]);

// Pure, stateless — deliberately not a module-level mutable counter
// (Milestone 40 design decision): a shared counter would leak across
// concurrent requests in a serverless environment, a real correctness
// bug, not just a style preference. Each facet builder calls this once,
// after it has already collected every ClaimVerificationResult from its
// own candidate loop, and logs the result — the minimum necessary for
// calibrating verifyClaimRelevance()'s heuristic against real cohort
// data later, matching this project's existing "minimum necessary"
// logging precedent rather than new monitoring infrastructure.
export function tallyClaimVerificationResults(results: ClaimVerificationResult[]): ClaimVerificationTally {
  const tally: ClaimVerificationTally = {
    claimsEvaluated: results.length,
    accepted: 0,
    rejectedByTraceability: 0,
    rejectedByRelevance: 0,
  };

  for (const result of results) {
    if (result.status === "matched") {
      tally.accepted += 1;
      continue;
    }

    if (result.reasonCode && TRACEABILITY_REASON_CODES.has(result.reasonCode)) {
      tally.rejectedByTraceability += 1;
    } else {
      tally.rejectedByRelevance += 1;
    }
  }

  return tally;
}
