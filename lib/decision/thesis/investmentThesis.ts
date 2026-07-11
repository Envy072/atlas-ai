import type { Evidence } from "@/lib/research";
import type { InvestmentThesis } from "@/lib/decision/schemas/thesis.schema";
import { InvestmentThesisSchema } from "@/lib/decision/schemas/thesis.schema";
import { parseOrThrow } from "@/lib/validation/parse";

export interface BuildInvestmentThesisInput {
  positiveArguments?: string[];
  negativeArguments?: string[];
  unknowns?: string[];
  contradictions?: string[];
  supportingEvidence?: Evidence[];
}

// The one place a real InvestmentThesis gets constructed — construction
// only, for a future caller with real, evidenced arguments.
export function buildInvestmentThesis(input: BuildInvestmentThesisInput): InvestmentThesis {
  return parseOrThrow(
    InvestmentThesisSchema,
    {
      positiveArguments: input.positiveArguments ?? [],
      negativeArguments: input.negativeArguments ?? [],
      unknowns: input.unknowns ?? [],
      contradictions: input.contradictions ?? [],
      supportingEvidence: input.supportingEvidence ?? [],
    },
    "Failed to build a schema-valid InvestmentThesis."
  );
}

// ARCHITECTURE ONLY. NO AI GENERATION. NO CONCLUSIONS. Weighing real
// arguments on both sides of an investment decision requires judgment
// this platform doesn't perform — stays honestly empty until a future
// module supplies real, evidenced arguments.
export function deriveEmptyThesis(): InvestmentThesis {
  return {
    positiveArguments: [],
    negativeArguments: [],
    unknowns: [],
    contradictions: [],
    supportingEvidence: [],
  };
}
