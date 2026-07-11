import type { CustomerSegment } from "@/lib/market";
import type { RevenueModel } from "@/lib/financial";
import type { BusinessModelFields } from "@/lib/business/types/synthesis";

export interface BusinessModelInputs {
  customerSegments?: CustomerSegment[];
  revenueModel?: RevenueModel;
  revenueStrategyRationale?: string;
}

// SYNTHESIS, NOT INVENTION. Combines what the Market Platform
// (customerSegments) and Financial Platform (revenueModel, a pricing
// strategy's rationale) already know into BusinessProfile's core "what is
// this business" fields — real passthrough of already-discovered data,
// never a fabricated narrative. `businessModel` is the Financial
// Platform's own RevenueModel enum value used as-is (e.g. "subscription")
// rather than expanded into invented prose.
export function deriveBusinessModelFields(inputs: BusinessModelInputs): BusinessModelFields {
  return {
    businessModel: inputs.revenueModel,
    customerSegments: inputs.customerSegments ?? [],
    revenueStrategy: inputs.revenueStrategyRationale,
  };
}
