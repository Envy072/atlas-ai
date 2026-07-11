import { z } from "zod";
import { DecisionProfileSchema, FindingCategorySchema } from "@/lib/decision";

// Reuses the exact array-of-Source / array-of-Evidence shapes
// DecisionProfileSchema already validates, via Zod's own `.shape`
// accessor — the same technique MILESTONE_12_DESIGN.md's
// PipelineContextSchema.shape.decision established. Never a fresh
// import into lib/research, and never redefined by hand.
const SourceListSchema = DecisionProfileSchema.shape.sources;
const EvidenceListSchema = DecisionProfileSchema.shape.evidence;

// A Finding or RiskFinding that carries at least one real Evidence entry
// — always true by construction, never enforced a second time here: a
// "critical_risk" claim is schema-guaranteed non-empty evidence by
// RiskFindingSchema itself (lib/decision), and a "finding" claim only
// ever reaches this shape after buildVerificationSummary.ts filters for
// non-empty evidence.
export const VerifiedClaimSchema = z.object({
  kind: z.enum(["finding", "critical_risk"]),
  category: FindingCategorySchema,
  severityLabel: z.string().min(1),
  summary: z.string().min(1),
  evidence: EvidenceListSchema,
  confidence: z.number().min(0).max(100),
});

export type VerifiedClaim = z.infer<typeof VerifiedClaimSchema>;

// The one output shape this layer produces (MILESTONE_13_DESIGN.md
// Section 5). Every field is either a direct pass-through from an
// already-complete DecisionProfile or a simple count over it — never a
// second confidence calculation, never a newly-generated claim.
export const VerificationSummarySchema = z.object({
  confidence: DecisionProfileSchema.shape.confidenceSummary,
  sources: SourceListSchema,
  sourceBreakdown: z.object({
    totalSources: z.number().int().nonnegative(),
    uniqueDomains: z.number().int().nonnegative(),
  }),
  verifiedClaims: z.array(VerifiedClaimSchema),
  unverifiedStatements: z.array(z.string()),
  verificationCounts: z.object({
    verifiedCount: z.number().int().nonnegative(),
    unverifiedCount: z.number().int().nonnegative(),
    verifiedRatio: z.number().min(0).max(1),
  }),
  generatedAt: z.string(),
});

export type VerificationSummary = z.infer<typeof VerificationSummarySchema>;
