import { z } from "zod";

// The seven-value category taxonomy (MILESTONE_39_DESIGN.md Section 9,
// revised after Principal Architect Review). The first five map
// one-to-one to the traceability-gated real-generation facets
// (Milestones 33-38) the roadmap's own "fabrication incident" language
// is specifically about. `intelligence_data` is the deliberate home
// for the Market/Competitor/Business/Financial Intelligence cards and
// the Business Platform's own SWOT — content populated by more
// mechanical discovery/classification logic, where an error is more
// likely a data-quality issue than a fabrication in the security-
// incident sense. `other` is a genuinely narrow catch-all: general
// product feedback or anything not tied to a specific analysis
// artifact, not a default dumping ground for the four card types above.
export const AnalysisFlagCategorySchema = z.enum([
  "finding",
  "critical_risk",
  "investment_thesis",
  "recommendation",
  "verdict",
  "intelligence_data",
  "other",
]);

export type AnalysisFlagCategory = z.infer<typeof AnalysisFlagCategorySchema>;

// What a caller submits — validated before any database call
// (MILESTONE_39_DESIGN.md Section 11). The length bounds on
// `description` mirror the database-level CHECK constraint
// (supabase/migrations/) — deliberately both, per CLAUDE.md Section 14.
export const CreateAnalysisFlagInputSchema = z.object({
  projectId: z.string().min(1),
  category: AnalysisFlagCategorySchema,
  description: z.string().min(10).max(2000),
});

export type CreateAnalysisFlagInput = z.infer<typeof CreateAnalysisFlagInputSchema>;

// The full, persisted shape — the schema/route/service/hook's single
// shared source of truth for what a real AnalysisFlag looks like once
// stored (CLAUDE.md Section 14, "one schema per shape").
// `reporterId` is nullable to match the schema's own ON DELETE SET
// NULL choice (MILESTONE_39_DESIGN.md Section 9) — the report must
// outlive its reporter's account, should one ever be deleted.
export const AnalysisFlagSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  reporterId: z.string().nullable(),
  category: AnalysisFlagCategorySchema,
  description: z.string(),
  createdAt: z.string(),
});

export type AnalysisFlag = z.infer<typeof AnalysisFlagSchema>;
