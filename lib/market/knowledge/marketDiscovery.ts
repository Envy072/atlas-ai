import { runResearch } from "@/lib/research";
import { discoverCompetitors } from "@/lib/competitors";
import type { MarketDiscoveryRequest, MarketDiscoveryResult } from "@/lib/market/schemas/discovery.schema";
import { MarketDiscoveryResultSchema } from "@/lib/market/schemas/discovery.schema";
import type { MarketClassification } from "@/lib/market/schemas/classification.schema";
import { classifyIndustry } from "@/lib/market/classification/industryClassifier";
import { buildMarketProfile } from "@/lib/market/knowledge/marketProfileBuilder";
import { parseOrThrow } from "@/lib/validation/parse";

// Frames the startup idea as a market-sizing/landscape query — a
// deliberately different string than the raw idea or lib/competitors'
// own "companies competing with: <idea>" framing, since this call is
// asking the Research Engine for market-level signal, not competitor
// names.
function buildMarketResearchQuery(startupIdea: string): string {
  return `market size and industry landscape for: ${startupIdea}`;
}

// Honest, real (not fabricated) confidence: the average confidence of
// whatever sources the Research Engine actually found (0 if it found
// none), averaged with how strongly the idea matched a known industry
// category. Never a flat/guessed number.
function computeDiscoveryConfidence(
  averageSourceConfidence: number | null,
  classification: MarketClassification
): number {
  if (averageSourceConfidence === null) return Math.round(classification.confidence / 2);
  return Math.round((averageSourceConfidence + classification.confidence) / 2);
}

// The single entry point this folder exists to provide: a startup idea in,
// a MarketProfile out — grounded in what the Research Engine and
// Competitor Platform actually found. Per this milestone's explicit rule,
// this consumes ONLY runResearch() (from lib/research's public barrel)
// and discoverCompetitors() (from lib/competitors' public barrel) — it
// never constructs a provider or searches directly, and never reaches
// into either platform's internals.
export async function discoverMarket(
  request: MarketDiscoveryRequest
): Promise<MarketDiscoveryResult> {
  const [researchResult, competitorDiscovery] = await Promise.all([
    runResearch({ topic: buildMarketResearchQuery(request.startupIdea) }),
    discoverCompetitors({ startupIdea: request.startupIdea }),
  ]);

  const classification = classifyIndustry(request.startupIdea);
  const confidence = computeDiscoveryConfidence(
    researchResult.sourceSummary.averageConfidence,
    classification
  );

  const profile = buildMarketProfile({
    industry: classification.industry,
    subIndustry: classification.subIndustry,
    sources: researchResult.sources,
    evidence: researchResult.evidence,
    confidence,
  });

  return parseOrThrow(
    MarketDiscoveryResultSchema,
    {
      request,
      profile,
      competitorCount: competitorDiscovery.candidates.length,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid MarketDiscoveryResult."
  );
}
