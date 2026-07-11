import { z } from "zod";

// Four SEPARATE data-quality dimensions — deliberately never collapsed
// into one "confidence" number, and deliberately never a stand-in for
// business quality (a business can be genuinely excellent with thin
// evidence, or genuinely weak with thorough evidence — this schema only
// describes how much and how fresh the underlying data is, never how
// good the business is). Every field is real and computable from data
// already gathered (see confidence/decisionConfidence.ts) — none is a
// placeholder.
export const DecisionConfidenceSchema = z.object({
  // Average confidence of the aggregated Evidence this decision rests on.
  evidenceConfidence: z.number().min(0).max(100),
  // What fraction of this platform's own structural data points
  // (business model, market industry, funding stage, findings, critical
  // risks, evidence...) actually got populated.
  coverage: z.number().min(0).max(100),
  // The complement of coverage, represented as its own named field per
  // this milestone's explicit instruction to track it separately — kept
  // as a distinct field so a future refinement (e.g. weighting some gaps
  // more heavily than others) can diverge from a strict 100-coverage
  // without a schema change.
  unknownPercentage: z.number().min(0).max(100),
  // Average age (in days) of the aggregated evidence's own
  // `retrievedAt` timestamps — absent when there's no evidence to
  // average (never fabricated as 0, which would falsely claim
  // "perfectly fresh").
  dataFreshnessDays: z.number().nonnegative().optional(),
});

export type DecisionConfidence = z.infer<typeof DecisionConfidenceSchema>;
