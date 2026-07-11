import { z } from "zod";
import { SourceSchema, EvidenceSchema } from "@/lib/research";
import { RefreshMetadataSchema } from "@/lib/competitors";
import { CustomerSegmentSchema } from "@/lib/market";
import { CompetitivePositionSchema, ExecutionComplexityLevelSchema } from "@/lib/business/schemas/enums";
import { EconomicMoatSchema } from "@/lib/business/schemas/moat.schema";
import { BusinessHealthSchema } from "@/lib/business/schemas/health.schema";
import { OperationalRiskSchema } from "@/lib/business/schemas/risk.schema";
import { DependencySchema } from "@/lib/business/schemas/execution.schema";

// The permanent knowledge-base record this whole platform exists to
// synthesize — one BusinessProfile per startup idea, combining what the
// Research, Competitor, Market, and Financial Platforms already know.
// Every list/optional field starts empty/undefined because this
// milestone's synthesis never invents a business fact it can't honestly
// derive from those four platforms (see knowledge/businessDiscovery.ts).
//
// Fields are flattened directly (not wrapped in a facet-specific object)
// wherever the underlying value is a simple narrative string or list —
// matching how lib/market and lib/financial flatten their own simple
// fields and reserve a nested object only for a genuinely multi-part
// concept (`economicMoat`, `overallHealth`). `customerSegments` reuses
// lib/market's own CustomerSegment schema rather than redefining it;
// `sources`/`evidence` reuse lib/research's; `refresh` reuses
// lib/competitors' — all imported from their public barrels, never
// redefined here, per this project's "one schema per shape" rule and
// this milestone's "consume only public exports" rule.
export const BusinessProfileSchema = z.object({
  id: z.string(),

  // Business Model
  businessModel: z.string().optional(),
  valueProposition: z.string().optional(),
  customerProblem: z.string().optional(),
  customerSegments: z.array(CustomerSegmentSchema),
  revenueStrategy: z.string().optional(),

  // Go-To-Market & Growth
  goToMarketStrategy: z.string().optional(),
  distributionChannels: z.array(z.string()),
  growthStrategy: z.string().optional(),
  growthDrivers: z.array(z.string()),
  expansionOpportunities: z.array(z.string()),

  // Competitive Position & Moat
  competitivePosition: CompetitivePositionSchema.optional(),
  competitiveAdvantages: z.array(z.string()),
  economicMoat: EconomicMoatSchema,

  // Execution
  executionComplexity: ExecutionComplexityLevelSchema.optional(),
  keyDependencies: z.array(DependencySchema),
  operationalRisks: z.array(OperationalRiskSchema),

  // SWOT & Overall Health
  businessStrengths: z.array(z.string()),
  businessWeaknesses: z.array(z.string()),
  businessOpportunities: z.array(z.string()),
  businessThreats: z.array(z.string()),
  overallHealth: BusinessHealthSchema,

  // Provenance
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
  refresh: RefreshMetadataSchema,
});

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
