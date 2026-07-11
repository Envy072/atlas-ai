import type { Evidence } from "@/lib/research";
import type { Severity } from "@/lib/market";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";
import type { FindingCategory } from "@/lib/decision/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

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

// ARCHITECTURE ONLY. Generating real findings requires an analysis
// engine this platform doesn't have yet — stays honestly empty until a
// future module supplies real, evidenced findings.
export function deriveFindings(): Finding[] {
  return [];
}
