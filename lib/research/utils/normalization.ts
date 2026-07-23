// Real, pure helpers — unlike providers/ranking, normalization needs no
// external data source to be genuinely correct today.

// Strips tracking params, trailing slashes, and lowercases the host, so
// "https://Example.com/post/?utm_source=x" and "https://example.com/post"
// are recognized as the same source later during deduplication.
//
// "utm_" is a genuine prefix family (utm_source, utm_medium, utm_campaign,
// utm_term, utm_content). The others are single, literal tracking keys,
// not prefixes — matching them via startsWith() previously also stripped
// unrelated keys that merely began with the same letters (e.g.
// "referral_code" or "refresh_token" via a bare "ref" prefix). No
// documented or observed contract elsewhere in this repository relies on
// a broader "ref"-family of keys, so this is an exact match instead.
const TRACKING_PARAM_KEY_PREFIXES = ["utm_"];
const TRACKING_PARAM_EXACT_KEYS = new Set(["ref", "fbclid", "gclid"]);

function isTrackingParam(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    TRACKING_PARAM_KEY_PREFIXES.some((prefix) => lowerKey.startsWith(prefix)) ||
    TRACKING_PARAM_EXACT_KEYS.has(lowerKey)
  );
}

export function normalizeUrl(rawUrl: string): string {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl.trim().toLowerCase();
  }

  url.hostname = url.hostname.toLowerCase();

  for (const key of Array.from(url.searchParams.keys())) {
    if (isTrackingParam(key)) {
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
