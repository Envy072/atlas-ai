import { z } from "zod";

// Which knowledge domain a Finding/RiskFinding is about — deliberately
// aligned with diligence/'s eight named sections (Business, Market,
// Competition, Financial, Operations, Technology, Legal, Execution) so
// diligence/dueDiligenceReport.ts can group findings into the right
// section by this field alone, plus "general" for anything that doesn't
// map to one specific section.
export const FindingCategorySchema = z.enum([
  "business",
  "market",
  "competition",
  "financial",
  "operations",
  "technology",
  "legal",
  "execution",
  "general",
]);

export type FindingCategory = z.infer<typeof FindingCategorySchema>;

// A four-level scale specifically for red flags (findings/'s own
// Finding.severity reuses lib/market's three-level Severity) — red flags
// are escalated risk items that need a tier above "high" for the
// deal-breaking case, which ordinary findings don't.
export const RedFlagSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

export type RedFlagSeverity = z.infer<typeof RedFlagSeveritySchema>;

// A qualitative readiness level — optional everywhere it's used (see
// readiness/decisionReadiness.ts), since this milestone has no real basis
// to assign one yet.
export const ReadinessLevelSchema = z.enum(["not_ready", "emerging", "ready", "strong"]);

export type ReadinessLevel = z.infer<typeof ReadinessLevelSchema>;

// Which of InvestmentThesis's four arrays a candidate thesis argument
// belongs in (MILESTONE_36_DESIGN.md Section 5) — a different axis from
// FindingCategory (knowledge domain) or RedFlagSeverity (escalation
// tier): this one determines bucket placement, not topic or severity.
export const ThesisArgumentKindSchema = z.enum(["positive", "negative", "unknown", "contradiction"]);

export type ThesisArgumentKind = z.infer<typeof ThesisArgumentKindSchema>;
