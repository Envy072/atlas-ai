import type { GoToMarketFields } from "@/lib/business/types/synthesis";

// ARCHITECTURE ONLY. NEVER INVENT BUSINESS FACTS. Naming real distribution
// channels or a real go-to-market narrative requires product/sales data
// this platform doesn't have yet — stays honestly empty until a future
// module supplies real input.
export function deriveGoToMarket(): GoToMarketFields {
  return { distributionChannels: [] };
}
