// Real, pure helpers — unlike providers/ranking, normalization needs no
// external data source to be genuinely correct today.

// Strips tracking params, trailing slashes, and lowercases the host, so
// "https://Example.com/post/?utm_source=x" and "https://example.com/post"
// are recognized as the same source later during deduplication.
const TRACKING_PARAM_PREFIXES = ["utm_", "ref", "fbclid", "gclid"];

export function normalizeUrl(rawUrl: string): string {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl.trim().toLowerCase();
  }

  url.hostname = url.hostname.toLowerCase();

  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAM_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix))) {
      url.searchParams.delete(key);
    }
  }

  url.hash = "";
  const normalizedPath = url.pathname.endsWith("/") && url.pathname !== "/"
    ? url.pathname.slice(0, -1)
    : url.pathname;

  return `${url.origin}${normalizedPath}${url.search}`;
}

export function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

// Collapses whitespace and trims — the same query text shouldn't produce
// a cache/dedup miss just because of incidental formatting differences.
export function normalizeQuery(topic: string): string {
  return topic.trim().replace(/\s+/g, " ").toLowerCase();
}
