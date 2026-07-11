import type { MarketClassification } from "@/lib/market/schemas/classification.schema";
import { MarketClassificationSchema } from "@/lib/market/schemas/classification.schema";
import { tokenize } from "@/lib/market/utils/textNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

// HEURISTIC, DOCUMENTED, NOT ML — a fixed keyword map, not an embedding or
// trained classifier, the same honesty standard as lib/competitors'
// discovery/candidateExtraction.ts. A future implementation can replace
// this map (or the whole function body) with a real NLP/LLM-based
// classifier without any caller changing, since every caller depends only
// on the (startupIdea) -> MarketClassification contract.
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  fintech: ["payment", "payments", "banking", "lending", "insurance", "trading", "fintech", "finance"],
  healthtech: ["health", "medical", "clinical", "patient", "healthcare", "telehealth", "biotech"],
  edtech: ["education", "learning", "student", "course", "curriculum", "tutor", "edtech"],
  saas: ["software", "saas", "subscription", "platform", "dashboard", "workflow", "automation"],
  ecommerce: ["ecommerce", "retail", "marketplace", "shopping", "storefront", "commerce"],
  logistics: ["logistics", "shipping", "delivery", "freight", "supply", "warehouse"],
  proptech: ["real estate", "property", "housing", "rental", "proptech", "landlord"],
  cleantech: ["climate", "energy", "solar", "carbon", "sustainability", "cleantech", "renewable"],
  hrtech: ["hiring", "recruiting", "recruitment", "payroll", "employee", "workforce"],
  martech: ["marketing", "advertising", "campaign", "seo", "martech", "analytics"],
};

function countKeywordMatches(ideaTokens: Set<string>, keywords: string[]): number {
  let matches = 0;

  for (const keyword of keywords) {
    const keywordTokens = keyword.split(" ");
    if (keywordTokens.every((token) => ideaTokens.has(token))) matches += 1;
  }

  return matches;
}

// Classifies a startup idea into one of a fixed set of industries by
// keyword overlap. `confidence` is honestly proportional to how many
// distinct keywords matched, capped at 100 — never a flat/fabricated
// number, and 0 (not a guessed default) when nothing matches at all.
export function classifyIndustry(startupIdea: string): MarketClassification {
  const ideaTokens = tokenize(startupIdea);

  let bestIndustry: string | null = null;
  let bestMatches = 0;

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const matches = countKeywordMatches(ideaTokens, keywords);
    if (matches > bestMatches) {
      bestMatches = matches;
      bestIndustry = industry;
    }
  }

  const industry = bestIndustry ?? "unclassified";
  const confidence = Math.min(100, bestMatches * 25);

  return parseOrThrow(
    MarketClassificationSchema,
    {
      industry,
      confidence,
      reason:
        bestIndustry !== null
          ? `Matched ${bestMatches} keyword(s) associated with "${bestIndustry}".`
          : "No keyword overlap with any known industry category.",
    },
    "Failed to build a schema-valid MarketClassification."
  );
}
