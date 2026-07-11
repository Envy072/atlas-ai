import type { Evidence } from "@/lib/research";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import { RiskFindingSchema } from "@/lib/decision/schemas/riskFinding.schema";
import type { FindingCategory, RedFlagSeverity } from "@/lib/decision/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

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

// ARCHITECTURE ONLY. Identifying real, evidence-backed red flags requires
// an analysis engine this platform doesn't have yet — stays honestly
// empty until a future module supplies real ones.
export function deriveCriticalRisks(): RiskFinding[] {
  return [];
}
