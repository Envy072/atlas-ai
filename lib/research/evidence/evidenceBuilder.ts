import type { Source } from "@/lib/research/schemas/source.schema";
import type { Evidence } from "@/lib/research/schemas/evidence.schema";
import { EvidenceSchema } from "@/lib/research/schemas/evidence.schema";
import { parseOrThrow } from "@/lib/validation/parse";

let evidenceCounter = 0;

function nextEvidenceId(): string {
  evidenceCounter += 1;
  return `evidence_${Date.now()}_${evidenceCounter}`;
}

export interface BuildEvidenceInput {
  claim: string;
  evidence: string;
  confidence: number;
  source: Source;
}

// The one place an Evidence object gets constructed, so every caller
// (eventually: a future research-aware pipeline stage) produces the same
// well-formed, schema-valid shape rather than hand-assembling the object
// and risking a missing/malformed field. Reuses lib/validation/parse.ts
// (Sprint 3, not frozen) rather than re-implementing schema validation.
export function buildEvidence(input: BuildEvidenceInput): Evidence {
  return parseOrThrow(
    EvidenceSchema,
    {
      id: nextEvidenceId(),
      claim: input.claim,
      evidence: input.evidence,
      confidence: input.confidence,
      source: input.source,
      url: input.source.url,
      retrievedAt: input.source.retrievedAt,
    },
    "Failed to build a schema-valid Evidence object."
  );
}
