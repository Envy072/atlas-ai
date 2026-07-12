import type { Source, Evidence } from "@/lib/research";
import type { DecisionProfile } from "@/lib/decision/schemas/decision.schema";
import { DecisionProfileSchema } from "@/lib/decision/schemas/decision.schema";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";
import { computeDecisionConfidence } from "@/lib/decision/confidence/decisionConfidence";
import type { CoverageChecklist } from "@/lib/decision/types/confidence";
import { buildDecisionRefreshMetadata } from "@/lib/decision/refresh/decisionRefreshPolicy";
import { dedupeByKey } from "@/lib/decision/utils/dedupeByKey";
import { urlDedupeKey } from "@/lib/decision/utils/urlNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

function dedupeByUrl<TItem extends { url: string }>(items: TItem[]): TItem[] {
  return dedupeByKey(items, (item) => urlDedupeKey(item.url));
}

function unionStrings(existing: string[], incoming: string[]): string[] {
  return Array.from(new Set([...existing, ...incoming]));
}

export interface MergeDecisionProfileInput {
  keyFindings?: Finding[];
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  criticalRisks?: RiskFinding[];
  sources?: Source[];
  evidence?: Evidence[];
  openQuestions?: string[];
}

// The core operation behind "this platform must accumulate knowledge
// over time" — mirrors the other four platforms' own profile mergers.
// Structured/plain list fields union (dedupe by id or by exact string);
// sources/evidence union by URL. `confidenceSummary`/`decisionReadiness`
// are always recomputed/regenerated from the merged inputs rather than
// hand-merged, since they're derived facts about the merged whole, not
// independent data to accumulate. `refresh` reason is "scheduled" — the
// caller overrides it afterward if this merge was actually triggered by
// a manual/stale reason.
export function mergeDecisionProfile(
  existing: DecisionProfile,
  incoming: MergeDecisionProfileInput,
  now: Date = new Date()
): DecisionProfile {
  const keyFindings = dedupeByKey(
    [...existing.keyFindings, ...(incoming.keyFindings ?? [])],
    (finding) => finding.id
  );
  const criticalRisks = dedupeByKey(
    [...existing.criticalRisks, ...(incoming.criticalRisks ?? [])],
    (risk) => risk.id
  );
  const sources = dedupeByUrl([...existing.sources, ...(incoming.sources ?? [])]);
  const evidence = dedupeByUrl([...existing.evidence, ...(incoming.evidence ?? [])]);
  const openQuestions = unionStrings(existing.openQuestions, incoming.openQuestions ?? []);

  const checklist: CoverageChecklist = {
    hasBusinessModel: Boolean(existing.businessSummary.businessModel),
    hasValueProposition: Boolean(existing.businessSummary.valueProposition),
    hasCustomerProblem: Boolean(existing.businessSummary.customerProblem),
    hasMarketIndustry: Boolean(existing.decisionContext.marketIndustry),
    hasFundingStage: Boolean(existing.decisionContext.fundingStage),
    hasFindings: keyFindings.length > 0,
    hasCriticalRisks: criticalRisks.length > 0,
    hasEvidence: evidence.length > 0,
    // MergeDecisionProfileInput doesn't accept new competitors (Milestone
    // 16 scoped keyCompetitors resolution to buildDecisionProfile() only
    // — see MILESTONE_16_DESIGN.md's Definition of Done); reflects the
    // existing profile's own count, unchanged by this merge.
    hasCompetitorProfiles: existing.keyCompetitors.length > 0,
  };
  const confidenceSummary = computeDecisionConfidence({ sources, evidence, checklist });

  return parseOrThrow(
    DecisionProfileSchema,
    {
      ...existing,
      keyFindings,
      strengths: unionStrings(existing.strengths, incoming.strengths ?? []),
      weaknesses: unionStrings(existing.weaknesses, incoming.weaknesses ?? []),
      opportunities: unionStrings(existing.opportunities, incoming.opportunities ?? []),
      threats: unionStrings(existing.threats, incoming.threats ?? []),
      criticalRisks,
      sources,
      evidence,
      confidenceSummary,
      openQuestions,
      refresh: buildDecisionRefreshMetadata("scheduled", confidenceSummary.evidenceConfidence, now),
    },
    "Failed to build a schema-valid merged DecisionProfile."
  );
}
