import { z } from "zod";
import { EvidenceSchema } from "@/lib/research";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";

// One due-diligence section — a summary placeholder (never generated
// text; stays optional/absent) plus whichever Findings were categorized
// into it (see diligence/dueDiligenceReport.ts's grouping-by-category
// logic).
export const DiligenceSectionSchema = z.object({
  summary: z.string().optional(),
  findings: z.array(FindingSchema),
});

export type DiligenceSection = z.infer<typeof DiligenceSectionSchema>;

// The eight named domain sections this milestone specifies, plus the two
// cross-cutting sections (Evidence, Unknowns) that aren't domain-specific
// findings groupings but a flat aggregate view across the whole report.
export const DueDiligenceReportSchema = z.object({
  business: DiligenceSectionSchema,
  market: DiligenceSectionSchema,
  competition: DiligenceSectionSchema,
  financial: DiligenceSectionSchema,
  operations: DiligenceSectionSchema,
  technology: DiligenceSectionSchema,
  legal: DiligenceSectionSchema,
  execution: DiligenceSectionSchema,
  evidence: z.array(EvidenceSchema),
  unknowns: z.array(z.string()),
  generatedAt: z.string(),
});

export type DueDiligenceReport = z.infer<typeof DueDiligenceReportSchema>;
