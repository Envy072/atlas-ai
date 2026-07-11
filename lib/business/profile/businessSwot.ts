import type { BusinessSwot } from "@/lib/business/types/synthesis";

// ARCHITECTURE ONLY. NEVER INVENT BUSINESS FACTS. A real SWOT assessment
// of the business itself (not a competitor's — see lib/competitors'
// CompanyProfile.strengths/weaknesses for that) requires synthesis this
// platform doesn't perform yet — stays honestly empty until a future
// module (likely an AI-assisted synthesis stage) supplies real,
// evidenced entries.
export function deriveBusinessSwot(): BusinessSwot {
  return { strengths: [], weaknesses: [], opportunities: [], threats: [] };
}
