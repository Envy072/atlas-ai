import type { Source, Evidence } from "@/lib/research";
import type { FinancialProfile } from "@/lib/financial/schemas/financial.schema";
import { FinancialProfileSchema } from "@/lib/financial/schemas/financial.schema";
import type { RevenueStream } from "@/lib/financial/schemas/revenue.schema";
import type { Expense } from "@/lib/financial/schemas/costs.schema";
import type { FinancialRisk } from "@/lib/financial/schemas/risk.schema";
import { buildFinancialRefreshMetadata } from "@/lib/financial/refresh/financialRefreshPolicy";
import { dedupeByKey, urlDedupeKey } from "@/lib/shared";
import { normalizeLabel } from "@/lib/financial/utils/textNormalization";
import { parseOrThrow } from "@/lib/validation/parse";

function dedupeByUrl<TItem extends { url: string }>(items: TItem[]): TItem[] {
  return dedupeByKey(items, (item) => urlDedupeKey(item.url));
}

export interface MergeFinancialProfileInput {
  revenueStreams?: RevenueStream[];
  expenses?: Expense[];
  financialRisks?: FinancialRisk[];
  financialAssumptions?: string[];
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
}

// The core operation behind "this platform must accumulate knowledge over
// time" — mirrors lib/competitors' mergeCompanyProfile and lib/market's
// mergeMarketProfile exactly. Structured list fields dedupe by a
// name-based key; sources/evidence dedupe by URL; financialAssumptions
// (plain strings) dedupe via a Set. `confidence` takes the incoming value
// and drives the next refresh schedule, reason "scheduled" — the caller
// overrides `refresh` afterward if this merge was actually triggered by a
// manual/stale reason.
//
// Deliberately does NOT touch any FinancialEstimate field (grossMargin,
// cac, mrr, ...) — those are only ever recomputed by
// knowledge/financialProfileBuilder.ts's economics/ calls, never
// hand-merged, so a merge can never silently overwrite a real estimate
// with a stale one or vice versa.
export function mergeFinancialProfile(
  existing: FinancialProfile,
  incoming: MergeFinancialProfileInput,
  now: Date = new Date()
): FinancialProfile {
  return parseOrThrow(
    FinancialProfileSchema,
    {
      ...existing,
      revenueStreams: dedupeByKey(
        [...existing.revenueStreams, ...(incoming.revenueStreams ?? [])],
        (stream) => normalizeLabel(stream.name)
      ),
      expenses: dedupeByKey(
        [...existing.expenses, ...(incoming.expenses ?? [])],
        (expense) => normalizeLabel(expense.name)
      ),
      financialRisks: dedupeByKey(
        [...existing.financialRisks, ...(incoming.financialRisks ?? [])],
        (risk) => normalizeLabel(`${risk.category}:${risk.name}`)
      ),
      financialAssumptions: Array.from(
        new Set([...existing.financialAssumptions, ...(incoming.financialAssumptions ?? [])])
      ),
      sources: dedupeByUrl([...existing.sources, ...(incoming.sources ?? [])]),
      evidence: dedupeByUrl([...existing.evidence, ...(incoming.evidence ?? [])]),
      confidence: incoming.confidence,
      refresh: buildFinancialRefreshMetadata("scheduled", incoming.confidence, now),
    },
    "Failed to build a schema-valid merged FinancialProfile."
  );
}
