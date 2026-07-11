import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import type { CompetitorScore } from "@/lib/competitors/schemas/scoring.schema";
import type { ComparisonCell, ComparisonMatrix, ComparisonTable } from "@/lib/competitors/schemas/comparison.schema";
import { ComparisonMatrixSchema } from "@/lib/competitors/schemas/comparison.schema";
import type { ComparisonDimension } from "@/lib/competitors/schemas/enums";
import { parseOrThrow } from "@/lib/validation/parse";

// How each dimension renders a CompanyProfile's own fields down to the
// generic `values: string[]` shape every ComparisonCell uses — real,
// functional composition logic (like Research Milestone 4's
// rankSources()), even though some of the data it reads (a profile's
// pricing/technology/etc.) may itself still be thin until real discovery
// data accumulates. An empty array renders as an empty cell, never a
// fabricated placeholder value.
function renderFeatures(profile: CompanyProfile): string[] {
  return profile.features;
}

function renderPricing(profile: CompanyProfile): string[] {
  if (!profile.pricing) return [];

  return profile.pricing.tiers.map((tier) => {
    const price = tier.priceUsd !== undefined ? `$${tier.priceUsd}` : "custom pricing";
    const period = tier.billingPeriod ? `/${tier.billingPeriod}` : "";
    return `${tier.name}: ${price}${period}`;
  });
}

function renderBusinessModel(profile: CompanyProfile): string[] {
  return profile.businessModel ? [profile.businessModel] : [];
}

function renderTargetMarket(profile: CompanyProfile): string[] {
  return profile.targetMarket ? [profile.targetMarket] : [];
}

function renderStrengths(profile: CompanyProfile): string[] {
  return profile.strengths;
}

function renderWeaknesses(profile: CompanyProfile): string[] {
  return profile.weaknesses;
}

function renderTechnology(profile: CompanyProfile): string[] {
  return profile.technology;
}

// Market position comes from the scoring engine's overall score, not the
// profile itself — a profile has no opinion about its own market
// standing, a score does. `scoresByCompanyId` is optional because a
// caller may want a comparison before scoring has ever run; the dimension
// simply renders empty for every company in that case, same as any other
// not-yet-known field.
function renderMarketPosition(
  profile: CompanyProfile,
  scoresByCompanyId: Map<string, CompetitorScore>
): string[] {
  const score = scoresByCompanyId.get(profile.id);
  return score ? [`Overall score: ${score.overallScore}/100`] : [];
}

const DIMENSION_RENDERERS: Record<
  ComparisonDimension,
  (profile: CompanyProfile, scoresByCompanyId: Map<string, CompetitorScore>) => string[]
> = {
  features: renderFeatures,
  pricing: renderPricing,
  business_model: renderBusinessModel,
  target_market: renderTargetMarket,
  strengths: renderStrengths,
  weaknesses: renderWeaknesses,
  technology: renderTechnology,
  market_position: renderMarketPosition,
};

const ALL_DIMENSIONS = Object.keys(DIMENSION_RENDERERS) as ComparisonDimension[];

function buildTable(
  dimension: ComparisonDimension,
  profiles: CompanyProfile[],
  scoresByCompanyId: Map<string, CompetitorScore>
): ComparisonTable {
  const renderer = DIMENSION_RENDERERS[dimension];

  const cells: ComparisonCell[] = profiles.map((profile) => ({
    companyId: profile.id,
    companyName: profile.name,
    values: renderer(profile, scoresByCompanyId),
  }));

  return { dimension, cells };
}

// Builds the full reusable comparison object across every dimension for a
// fixed set of companies — the shape a future comparison UI renders
// directly, without needing to know anything about CompanyProfile's
// internal structure.
export function buildComparison(
  profiles: CompanyProfile[],
  scores: CompetitorScore[] = []
): ComparisonMatrix {
  const scoresByCompanyId = new Map(scores.map((score) => [score.companyId, score]));

  const tables = ALL_DIMENSIONS.map((dimension) => buildTable(dimension, profiles, scoresByCompanyId));

  return parseOrThrow(
    ComparisonMatrixSchema,
    {
      companyIds: profiles.map((profile) => profile.id),
      tables,
      generatedAt: new Date().toISOString(),
    },
    "Failed to build a schema-valid ComparisonMatrix."
  );
}
