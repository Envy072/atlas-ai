import { runResearch } from "@/lib/research";
import { discoverCompetitors } from "@/lib/competitors";
import { discoverMarket } from "@/lib/market";
import type {
  FinancialDiscoveryRequest,
  FinancialDiscoveryResult,
} from "@/lib/financial/schemas/discovery.schema";
import { FinancialDiscoveryResultSchema } from "@/lib/financial/schemas/discovery.schema";
import { buildFinancialProfile } from "@/lib/financial/knowledge/financialProfileBuilder";
import { parseOrThrow } from "@/lib/validation/parse";

// Frames the startup idea as a financial-landscape query — a deliberately
// different string than lib/market's own "market size and industry
// landscape for: <idea>" framing, since this call is asking the Research
// Engine for financial signal (pricing, unit economics, funding history)
// specifically.
function buildFinancialResearchQuery(startupIdea: string): string {
  return `pricing, unit economics, and funding history for: ${startupIdea}`;
}

// Honest, real confidence: the average of the Research Engine's own
// source confidence and the Market Platform's own discovery confidence
// (itself derived from real research + classification signals) — never a
// flat/guessed number, and never re-deriving industry classification or
// research-confidence logic that lib/market already owns.
function computeDiscoveryConfidence(
  averageSourceConfidence: number | null,
  marketConfidence: number
): number {
  if (averageSourceConfidence === null) return Math.round(marketConfidence / 2);
  return Math.round((averageSourceConfidence + marketConfidence) / 2);
}

function buildInitialAssumptions(marketIndustry: string, competitorCount: number): string[] {
  return [
    `Industry classified as "${marketIndustry}" by the Market Intelligence Platform.`,
    `${competitorCount} competitor candidate(s) identified by the Competitor Intelligence Platform for pricing context.`,
  ];
}

// The single entry point this folder exists to provide: a startup idea
// in, a FinancialProfile out. Per this milestone's explicit rule
// ("Financial discovery must consume ONLY: Research Platform, Competitor
// Platform, Market Platform. Never call providers directly. Never
// duplicate existing logic."), this file calls only runResearch()
// (lib/research), discoverCompetitors() (lib/competitors), and
// discoverMarket() (lib/market) — it never constructs a provider, never
// re-implements industry classification (reuses lib/market's own
// discoverMarket().profile.industry instead), and never re-implements
// competitor pricing analysis (reuses discoverCompetitors().candidates
// only as a count signal).
export async function discoverFinancials(
  request: FinancialDiscoveryRequest
): Promise<FinancialDiscoveryResult> {
  const [researchResult, competitorDiscovery, marketDiscovery] = await Promise.all([
    runResearch({ topic: buildFinancialResearchQuery(request.startupIdea) }),
    discoverCompetitors({ startupIdea: request.startupIdea }),
    discoverMarket({ startupIdea: request.startupIdea }),
  ]);

  const confidence = computeDiscoveryConfidence(
    researchResult.sourceSummary.averageConfidence,
    marketDiscovery.profile.confidence
  );

  const profile = buildFinancialProfile({
    sources: researchResult.sources,
    evidence: researchResult.evidence,
    financialAssumptions: buildInitialAssumptions(
      marketDiscovery.profile.industry,
      competitorDiscovery.candidates.length
    ),
    economicsContext: { industry: marketDiscovery.profile.industry },
    confidence,
  });

  return parseOrThrow(
    FinancialDiscoveryResultSchema,
    {
      request,
      profile,
      competitorCount: competitorDiscovery.candidates.length,
      marketIndustry: marketDiscovery.profile.industry,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid FinancialDiscoveryResult."
  );
}
