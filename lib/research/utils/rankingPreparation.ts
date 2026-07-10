import type { Source } from "@/lib/research/schemas/source.schema";

// Pure derivations from a Source that a scoring factor would need — kept
// here (not inside the scorers themselves) so a real freshness/authority
// implementation later reuses this instead of recomputing the same thing
// its own way.

export function getSourceAgeInDays(source: Source): number | null {
  if (!source.publishedAt) return null;

  const publishedMs = Date.parse(source.publishedAt);
  if (Number.isNaN(publishedMs)) return null;

  return Math.max(0, (Date.now() - publishedMs) / 86_400_000);
}

// Very rough token-overlap similarity between a topic and a source's
// title/snippet — a genuine (if simple) starting point, not a stub,
// since it needs no external service to compute. A future implementation
// can replace this with embedding-based similarity without changing the
// 0-1 return contract callers depend on.
export function getTopicOverlapRatio(topic: string, source: Source): number {
  const topicTokens = tokenize(topic);
  if (topicTokens.size === 0) return 0;

  const sourceTokens = tokenize(`${source.title} ${source.snippet ?? ""}`);
  let overlap = 0;

  for (const token of topicTokens) {
    if (sourceTokens.has(token)) overlap += 1;
  }

  return overlap / topicTokens.size;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
  );
}
