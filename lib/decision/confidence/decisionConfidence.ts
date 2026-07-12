import type { Source, Evidence } from "@/lib/research";
import type { DecisionConfidence } from "@/lib/decision/schemas/confidence.schema";
import { DecisionConfidenceSchema } from "@/lib/decision/schemas/confidence.schema";
import type { CoverageChecklist } from "@/lib/decision/types/confidence";
import { parseOrThrow } from "@/lib/validation/parse";

const MS_PER_DAY = 86_400_000;
// Milestone 16 added hasCompetitorProfiles (8 → 9); Milestone 17 adds
// hasMarketProfile (9 → 10) — computeCoverage() itself needed no logic
// change either time, only this constant, since it's already generic
// over the checklist's own field count
// (Object.values(checklist).filter(Boolean).length).
const CHECKLIST_SIZE = 10;

// Real, deterministic composition — every input here is a fact already
// known (a field is present or it isn't; an evidence item has a real
// confidence and a real retrievedAt timestamp), so every output is
// computed, never fabricated. Mirrors the "real composition over
// already-known data" pattern lib/financial's computeLtvToCacRatio and
// every platform's scoring engine established.
function computeCoverage(checklist: CoverageChecklist): number {
  const trueCount = Object.values(checklist).filter(Boolean).length;
  return Math.round((trueCount / CHECKLIST_SIZE) * 100);
}

function computeEvidenceConfidence(evidence: Evidence[]): number {
  if (evidence.length === 0) return 0;
  const total = evidence.reduce((sum, item) => sum + item.confidence, 0);
  return Math.round(total / evidence.length);
}

// Absent (not 0) when there's no evidence to average — a 0 would falsely
// claim "perfectly fresh," which is the opposite of "unknown."
function computeDataFreshnessDays(sources: Source[]): number | undefined {
  if (sources.length === 0) return undefined;

  const now = Date.now();
  const totalAgeDays = sources.reduce((sum, source) => {
    const retrievedMs = Date.parse(source.retrievedAt);
    const ageDays = Number.isNaN(retrievedMs) ? 0 : (now - retrievedMs) / MS_PER_DAY;
    return sum + Math.max(0, ageDays);
  }, 0);

  return Math.round((totalAgeDays / sources.length) * 10) / 10;
}

export interface ComputeDecisionConfidenceInput {
  sources: Source[];
  evidence: Evidence[];
  checklist: CoverageChecklist;
}

// The single place a DecisionConfidence gets computed — every field is
// real and derived from data this platform already has (see the module
// doc comment above); never a fabricated placeholder, and never a stand-
// in for how good the business itself is (see confidence.schema.ts).
export function computeDecisionConfidence(input: ComputeDecisionConfidenceInput): DecisionConfidence {
  const coverage = computeCoverage(input.checklist);

  return parseOrThrow(
    DecisionConfidenceSchema,
    {
      evidenceConfidence: computeEvidenceConfidence(input.evidence),
      coverage,
      unknownPercentage: 100 - coverage,
      dataFreshnessDays: computeDataFreshnessDays(input.sources),
    },
    "Failed to build a schema-valid DecisionConfidence."
  );
}
