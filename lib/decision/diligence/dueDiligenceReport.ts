import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import type { DiligenceSection, DueDiligenceReport } from "@/lib/decision/schemas/diligence.schema";
import { DueDiligenceReportSchema } from "@/lib/decision/schemas/diligence.schema";
import type { FindingCategory } from "@/lib/decision/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

const SECTION_CATEGORIES = [
  "business",
  "market",
  "competition",
  "financial",
  "operations",
  "technology",
  "legal",
  "execution",
] as const;

function sectionFor(findings: Finding[], category: FindingCategory): DiligenceSection {
  return { findings: findings.filter((finding) => finding.category === category) };
}

// Reshapes an already-built DecisionProfile into the Due Diligence
// consumer's expected shape — real, mechanical grouping of
// `profile.keyFindings` by category into each of the eight named
// sections (a Finding categorized "general" belongs to none of them,
// which is the honest outcome, not an omission bug). `evidence` and
// `unknowns` are the two cross-cutting sections, reused directly from
// the profile's own aggregated evidence and open questions — nothing
// here is newly generated.
export function buildDueDiligenceReport(profile: DecisionProfile): DueDiligenceReport {
  const sections = Object.fromEntries(
    SECTION_CATEGORIES.map((category) => [category, sectionFor(profile.keyFindings, category)])
  ) as Record<(typeof SECTION_CATEGORIES)[number], DiligenceSection>;

  return parseOrThrow(
    DueDiligenceReportSchema,
    {
      ...sections,
      evidence: profile.evidence,
      unknowns: profile.openQuestions,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid DueDiligenceReport."
  );
}
