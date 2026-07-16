import { z } from "zod";
import { EvidenceSchema } from "@/lib/research";

// NO CONCLUSIONS. Deliberately has no "conclusion" or "verdict" field —
// this shape represents the *raw material* an investment thesis is
// built from (arguments on both sides, unknowns, contradictions), never
// a synthesized judgment. Real generation populates these fields (see
// thesis/investmentThesis.ts's deriveInvestmentThesis(), Milestone 36);
// a future module decides what to conclude from them — this schema
// only gives it a place to put the inputs.
export const InvestmentThesisSchema = z.object({
  positiveArguments: z.array(z.string()),
  negativeArguments: z.array(z.string()),
  unknowns: z.array(z.string()),
  contradictions: z.array(z.string()),
  supportingEvidence: z.array(EvidenceSchema),
});

export type InvestmentThesis = z.infer<typeof InvestmentThesisSchema>;
