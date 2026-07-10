import type { Source } from "@/lib/research/schemas/source.schema";
import { normalizeUrl } from "@/lib/research/utils/normalization";

// Two sources are the same evidence if they resolve to the same
// normalized URL, even if two different providers (or the same provider
// twice) surfaced them independently. Keeps the first occurrence
// (earliest provider in the merge order), consistent with how
// Array.prototype methods conventionally treat "first wins."
export function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const deduped: Source[] = [];

  for (const source of sources) {
    const key = normalizeUrl(source.url);

    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(source);
  }

  return deduped;
}
