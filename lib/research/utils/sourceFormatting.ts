import type { Source } from "@/lib/research/schemas/source.schema";
import { extractDomain } from "@/lib/research/utils/normalization";

// A single-line, human-readable citation string — "Title — domain.com,
// 3 days ago" — the same formatting a UI or a generated report would want
// wherever a Source needs to be shown inline rather than as a full card.
export function formatSourceCitation(source: Source): string {
  const domain = extractDomain(source.url);
  const age = source.publishedAt ? formatRelativeAge(source.publishedAt) : null;

  return age ? `${source.title} — ${domain}, ${age}` : `${source.title} — ${domain}`;
}

function formatRelativeAge(isoDate: string): string | null {
  const publishedMs = Date.parse(isoDate);
  if (Number.isNaN(publishedMs)) return null;

  const daysAgo = Math.max(0, Math.round((Date.now() - publishedMs) / 86_400_000));

  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "1 day ago";
  return `${daysAgo} days ago`;
}
