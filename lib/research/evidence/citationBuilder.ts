import type { Evidence } from "@/lib/research/schemas/evidence.schema";
import type { Citation } from "@/lib/research/schemas/citation.schema";
import { CitationSchema } from "@/lib/research/schemas/citation.schema";
import { parseOrThrow } from "@/lib/validation/parse";

let citationCounter = 0;

function nextCitationId(): string {
  citationCounter += 1;
  return `citation_${Date.now()}_${citationCounter}`;
}

// Builds a Citation linking a generated claim back to the Evidence that
// supports it. `confidence` defaults to the lowest of the cited
// evidence's own confidences — a claim is only as trustworthy as its
// weakest supporting evidence, not its strongest.
export function buildCitation(claim: string, supportingEvidence: Evidence[]): Citation {
  const confidence =
    supportingEvidence.length > 0
      ? Math.min(...supportingEvidence.map((evidence) => evidence.confidence))
      : 0;

  return parseOrThrow(
    CitationSchema,
    {
      id: nextCitationId(),
      claim,
      evidenceIds: supportingEvidence.map((evidence) => evidence.id),
      confidence,
    },
    "Failed to build a schema-valid Citation object."
  );
}
