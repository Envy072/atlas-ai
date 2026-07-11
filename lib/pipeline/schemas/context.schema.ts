import { z } from "zod";
import { ResearchResultSchema } from "@/lib/research";
import { CompetitorDiscoveryResultSchema } from "@/lib/competitors";
import { MarketDiscoveryResultSchema } from "@/lib/market";
import { FinancialDiscoveryResultSchema } from "@/lib/financial";
import { BusinessDiscoveryResultSchema } from "@/lib/business";
import { DecisionSynthesisResultSchema } from "@/lib/decision";

// The Pipeline Context (MILESTONE_11_DESIGN.md Section 21) — the single,
// append-only object every stage adds its own output to. Every field
// beyond `startupIdea` is optional because the Context only ever grows;
// it starts with just the idea and gains one field per stage as that
// stage succeeds. Every result schema here is reused directly from its
// owning platform's own public barrel (never redefined) — this file adds
// no new shape, it only names the object that holds all six together.
//
// This Context is never passed as an input to any platform call — every
// stage still invokes its own platform function with only the
// `startupIdea` string (see schemas/stage.schema.ts and stages/). It
// exists solely for this orchestration layer's own observability,
// checkpointing, and partial-result reporting.
export const PipelineContextSchema = z.object({
  startupIdea: z.string().min(1),
  research: ResearchResultSchema.optional(),
  competitors: CompetitorDiscoveryResultSchema.optional(),
  market: MarketDiscoveryResultSchema.optional(),
  financial: FinancialDiscoveryResultSchema.optional(),
  business: BusinessDiscoveryResultSchema.optional(),
  decision: DecisionSynthesisResultSchema.optional(),
});

export type PipelineContext = z.infer<typeof PipelineContextSchema>;
