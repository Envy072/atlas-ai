import type { Source } from "@/lib/research";
import { extractCompanyDomain } from "@/lib/competitors/utils/urlNormalization";

// HEURISTIC, DOCUMENTED, NOT ML — the same honesty standard as
// lib/research's Brave position-based confidence: a real, deterministic
// starting point rather than a fake placeholder, but explicitly not a
// claim of NLP-grade entity extraction. Most company marketing titles put
// the brand name first, separated from a tagline by a dash/pipe/colon —
// "HubSpot | Marketing, Sales, and Service Software" -> "HubSpot". Falls
// back to a capitalized domain label when a title has no such separator.
const TITLE_SEPARATOR_PATTERN = /\s+[|\-–:]\s+/;

export function extractCandidateName(source: Source): string {
  const [firstSegment] = source.title.split(TITLE_SEPARATOR_PATTERN);
  const trimmed = firstSegment?.trim();

  if (trimmed && trimmed.length > 0) return trimmed;

  return capitalizeDomainLabel(extractCompanyDomain(source.url));
}

function capitalizeDomainLabel(domain: string): string {
  const label = domain.split(".")[0] ?? domain;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
