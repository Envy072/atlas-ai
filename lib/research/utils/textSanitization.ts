// Tavily, Brave, and Crunchbase all return snippet text formatted as an
// HTML fragment meant for direct embedding in a search-results page —
// inline <strong> tags around matched keywords, HTML-entity-encoded
// punctuation (&quot;, &#x27;, &amp;). Every real provider's own
// normalizeResults() calls sanitizeSnippet() exactly once, at ingestion,
// so every downstream consumer (Evidence, every knowledge-platform
// schema, every report UI) always receives plain, readable text — one
// normalization point, never a second render-time cleanup step
// duplicated across components (Milestone 118, Critical Finding C1 from
// the Private Beta Readiness Review).
const HTML_TAG_PATTERN = /<[^>]*>/g;

// Only the named entities actually observed in real provider responses
// plus their common relatives — not a general-purpose HTML entity table.
// A named entity this map doesn't recognize is left exactly as-is
// (never silently dropped), matching this codebase's "honest fallback,
// never fabricate" convention.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g;

function decodeEntity(match: string, body: string): string {
  if (body[0] === "#") {
    const isHex = body[1] === "x" || body[1] === "X";
    const codePoint = isHex ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
  }

  return NAMED_ENTITIES[body] ?? match;
}

function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY_PATTERN, decodeEntity);
}

// Strips HTML tags before decoding entities — a genuinely-encoded
// literal angle bracket in the source data (&lt;script&gt; meant to be
// read as plain text, not executed markup) only ever appears in real
// provider responses as already-escaped text, never as a raw tag, so
// stripping first and decoding second means neither pass can
// misinterpret the other's output.
export function sanitizeSnippet(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;

  const withoutTags = raw.replace(HTML_TAG_PATTERN, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  const collapsed = decoded.replace(/\s+/g, " ").trim();

  return collapsed.length > 0 ? collapsed : undefined;
}
