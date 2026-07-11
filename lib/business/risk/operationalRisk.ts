import type { OperationalRisk } from "@/lib/business/schemas/risk.schema";
import { OperationalRiskSchema } from "@/lib/business/schemas/risk.schema";
import type { Severity } from "@/lib/market";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildOperationalRiskInput {
  name: string;
  description?: string;
  severity?: Severity;
}

// The one place an OperationalRisk gets constructed — construction only,
// for a future caller with real, evidenced input.
export function buildOperationalRisk(input: BuildOperationalRiskInput): OperationalRisk {
  return parseOrThrow(
    OperationalRiskSchema,
    {
      name: input.name,
      description: input.description,
      severity: input.severity,
    },
    "Failed to build a schema-valid OperationalRisk."
  );
}

// ARCHITECTURE ONLY. NEVER INVENT BUSINESS FACTS. Identifying real
// operational risks requires operational data this platform doesn't have
// yet — stays honestly empty until a future module supplies real input.
export function deriveOperationalRisks(): OperationalRisk[] {
  return [];
}
