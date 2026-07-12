import { z } from "zod";
import { SourceSchema, EvidenceSchema } from "@/lib/research";
import { RefreshMetadataSchema, CompanyProfileSchema } from "@/lib/competitors";
import { MarketProfileSchema } from "@/lib/market";
import { DecisionContextSchema } from "@/lib/decision/schemas/context.schema";
import { BusinessSummarySchema } from "@/lib/decision/schemas/businessSummary.schema";
import { InvestmentThesisSchema } from "@/lib/decision/schemas/thesis.schema";
import { FindingSchema } from "@/lib/decision/schemas/finding.schema";
import { RiskFindingSchema } from "@/lib/decision/schemas/riskFinding.schema";
import { DecisionConfidenceSchema } from "@/lib/decision/schemas/confidence.schema";
import { DecisionReadinessSchema } from "@/lib/decision/schemas/readiness.schema";

// The permanent knowledge-base record this whole platform exists to
// synthesize — one DecisionProfile per startup idea, combining what
// every knowledge platform beneath it already knows into the shape every
// future consumer (Investor Reports, Due Diligence, Investment Memo,
// Executive Summary, Funding Readiness, Acquisition Review, Bank Lending
// Assessment, Accelerator Evaluation) needs, so none of them has to
// re-implement business analysis itself.
//
// `strengths`/`weaknesses`/`opportunities`/`threats` are the Business
// Platform's own SWOT, reused verbatim (never recomputed) — Decision
// Intelligence's job is to combine existing knowledge, not to re-derive
// a business's SWOT a second time. `sources`/`evidence` reuse
// lib/research's schemas; `refresh` reuses lib/competitors' — neither
// redefined here. `keyCompetitors` (Milestone 16, additive) reuses
// lib/competitors' own CompanyProfileSchema verbatim — real, persisted,
// accumulating competitor records resolved by
// lib/competitors.resolveCompetitorKnowledge(), never a parallel
// "decision-local" competitor shape. `marketProfile` (Milestone 17,
// additive) reuses lib/market's own MarketProfileSchema verbatim,
// resolved by lib/market.resolveMarketKnowledge() — always present
// (even for an "unclassified" industry), since a MarketProfile object
// always exists once classification runs.
export const DecisionProfileSchema = z.object({
  id: z.string(),
  decisionContext: DecisionContextSchema,
  businessSummary: BusinessSummarySchema,
  investmentThesis: InvestmentThesisSchema,
  keyFindings: z.array(FindingSchema),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
  criticalRisks: z.array(RiskFindingSchema),
  keyCompetitors: z.array(CompanyProfileSchema),
  marketProfile: MarketProfileSchema,
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  confidenceSummary: DecisionConfidenceSchema,
  openQuestions: z.array(z.string()),
  decisionReadiness: DecisionReadinessSchema,
  decisionLimitations: z.array(z.string()),
  refresh: RefreshMetadataSchema,
});

export type DecisionProfile = z.infer<typeof DecisionProfileSchema>;
