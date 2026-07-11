import { z } from "zod";
import { SourceSchema, EvidenceSchema } from "@/lib/research";
import { CompetitorCategorySchema } from "@/lib/competitors/schemas/enums";
import { PricingSchema } from "@/lib/competitors/schemas/pricing.schema";
import { FundingSchema } from "@/lib/competitors/schemas/funding.schema";
import { RefreshMetadataSchema } from "@/lib/competitors/schemas/refresh.schema";

// The permanent knowledge-base record for one company — the single shape
// this whole platform exists to accumulate over time. Every field beyond
// `id`/`name` is optional or an empty-array default because a freshly
// discovered company legitimately knows almost nothing yet; the platform
// fills the shape in over successive refreshes rather than requiring it
// complete on day one (see knowledge/profileMerger.ts).
//
// `sources`/`evidence` reuse the Research Engine's own Source/Evidence
// shapes (imported from "@/lib/research", its public barrel — never a
// deep import into lib/research/schemas/*) rather than redefining an
// equivalent shape here, per this project's "one schema per shape" rule.
export const CompanyProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  website: z.string().url().optional(),
  category: CompetitorCategorySchema.optional(),
  description: z.string().optional(),
  targetMarket: z.string().optional(),
  businessModel: z.string().optional(),
  pricing: PricingSchema.optional(),
  features: z.array(z.string()),
  funding: FundingSchema.optional(),
  technology: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
  refresh: RefreshMetadataSchema,
});

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;
