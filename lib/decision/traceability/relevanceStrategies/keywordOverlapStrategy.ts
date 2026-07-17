import type { Evidence } from "@/lib/research";
import type { CandidateClaim } from "@/lib/decision/schemas/candidateClaim.schema";
import type { RelevanceStrategy } from "@/lib/decision/traceability/claimVerifier";

// A small, fixed stopword list — not an NLP library. Deliberately short:
// this heuristic only needs to filter out words common enough to create
// false-positive overlap between two genuinely unrelated texts, not
// perform real linguistic analysis.
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "been",
  "will",
  "are",
  "was",
  "were",
  "its",
  "their",
  "about",
  "into",
  "over",
  "under",
  "more",
  "than",
  "such",
  "some",
  "only",
  "also",
  "when",
  "what",
  "which",
  "who",
  "how",
]);

const MIN_TOKEN_LENGTH = 4;
const NUMERIC_TOKEN = /^[0-9]+$/;

// Lowercase, strip everything but letters/digits, split on whitespace,
// drop short/stopword tokens. A purely numeric token (e.g. "40" from
// "40%") is exempt from the minimum-length filter — a short word like
// "the" is noise, but a short number is a meaningful, low-noise exact
// match this heuristic can use for free (Milestone 40 review: numeric
// claims are a case worth handling well, not accidentally filtering out).
function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0 && (NUMERIC_TOKEN.test(token) || token.length >= MIN_TOKEN_LENGTH))
      .filter((token) => !STOPWORDS.has(token))
  );
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) {
    if (b.has(token)) return true;
  }
  return false;
}

// The current, default RelevanceStrategy implementation (Milestone 40).
// A deliberately coarse, deterministic heuristic — NOT semantic
// understanding. It closes one specific, real gap left open by
// verifyClaimTraceability() (MILESTONE_33_DESIGN.md Section 4/12): a
// citation can be real (the id resolves, the quote is genuine) while the
// evidence it points to is about a topically different subject than the
// claim asserts. This strategy cannot detect a synonym, a plural/singular
// variant, or an abbreviation as "the same concept" — those are
// documented, expected limitations (see keywordOverlapStrategy.test.ts),
// not bugs to be patched here. A future RelevanceStrategy (embedding
// similarity, an LLM judge) can replace this file's export entirely
// without any change to verifyClaimRelevance()'s signature or any of the
// five call sites that reach it through verifyClaim().
//
// Deliberately permissive: requires only ONE shared significant token
// between the claim and the union of its resolved evidence, favoring
// false negatives (a real mismatch slipping through) over false
// positives (a legitimate, correctly-cited claim being wrongly
// rejected) — this is a supplementary net alongside human review (the
// Milestone 39 flagging mechanism), not a sole line of defense.
export const keywordOverlapStrategy: RelevanceStrategy = async (
  claim: CandidateClaim,
  resolvedEvidence: Evidence[]
) => {
  const claimTokens = significantTokens(claim.summary);

  if (claimTokens.size === 0) {
    return { isRelevant: false, reasonCode: "EMPTY_SIGNIFICANT_TOKENS" };
  }

  const evidenceText = resolvedEvidence.map((item) => `${item.claim} ${item.evidence}`).join(" ");
  const evidenceTokens = significantTokens(evidenceText);

  if (evidenceTokens.size === 0) {
    return { isRelevant: false, reasonCode: "EMPTY_SIGNIFICANT_TOKENS" };
  }

  if (!hasOverlap(claimTokens, evidenceTokens)) {
    return { isRelevant: false, reasonCode: "LOW_RELEVANCE_SCORE" };
  }

  return { isRelevant: true, reasonCode: null };
};
