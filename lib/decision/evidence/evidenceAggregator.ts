import type { Source, Evidence } from "@/lib/research";
import { dedupeByKey } from "@/lib/decision/utils/dedupeByKey";
import { urlDedupeKey } from "@/lib/decision/utils/urlNormalization";

export interface AggregatedEvidence {
  sources: Source[];
  evidence: Evidence[];
}

function dedupeByUrl<TItem extends { url: string }>(items: TItem[]): TItem[] {
  return dedupeByKey(items, (item) => urlDedupeKey(item.url));
}

// Real aggregation, not generation: merges the Source/Evidence lists
// already gathered by every upstream platform's own discovery call
// (Research's own result, plus whatever each of Competitor/Market/
// Financial/Business's own profile already carries) into one
// deduplicated set. No new evidence is ever invented here — this
// function only combines and dedupes what already exists, exactly the
// "combine existing knowledge" role this milestone assigns Decision
// Intelligence.
export function aggregateEvidence(
  sourceLists: Source[][],
  evidenceLists: Evidence[][]
): AggregatedEvidence {
  return {
    sources: dedupeByUrl(sourceLists.flat()),
    evidence: dedupeByUrl(evidenceLists.flat()),
  };
}
