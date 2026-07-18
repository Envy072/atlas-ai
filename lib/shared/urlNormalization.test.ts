import { describe, it, expect } from "vitest";
import { urlDedupeKey } from "@/lib/shared/urlNormalization";

// The single shared implementation (Milestone 51) for what was
// previously five byte-identical, independently-written copies —
// verified byte-identical before consolidation. This function is
// deliberately simple (trim, lowercase, strip one trailing slash) —
// it is not lib/research/utils/normalization.ts's own normalizeUrl(),
// which additionally strips tracking params and hashes. Tests below
// cover exactly what this implementation actually does, including its
// real, existing limitations, not an idealized version of it.
describe("urlDedupeKey", () => {
  it("returns identical keys for identical URLs", () => {
    expect(urlDedupeKey("https://example.com/post")).toBe(urlDedupeKey("https://example.com/post"));
  });

  it("is case-insensitive", () => {
    expect(urlDedupeKey("HTTPS://EXAMPLE.COM/Post")).toBe(urlDedupeKey("https://example.com/post"));
  });

  it("trims leading and trailing whitespace", () => {
    expect(urlDedupeKey("  https://example.com/post  ")).toBe(urlDedupeKey("https://example.com/post"));
  });

  it("strips exactly one trailing slash", () => {
    expect(urlDedupeKey("https://example.com/post/")).toBe(urlDedupeKey("https://example.com/post"));
  });

  it("does not collapse a double trailing slash to the same key", () => {
    // Only one trailing slash is ever stripped (`.slice(0, -1)` runs
    // once) — a real, existing limitation, not a bug introduced here.
    expect(urlDedupeKey("https://example.com/post//")).not.toBe(urlDedupeKey("https://example.com/post"));
  });

  it("does NOT normalize protocol — http and https are different keys", () => {
    // Real, existing behavior: this function does no protocol handling
    // at all, unlike lib/research's own normalizeUrl().
    expect(urlDedupeKey("http://example.com/post")).not.toBe(urlDedupeKey("https://example.com/post"));
  });

  it("does NOT strip a www. prefix — www and non-www are different keys", () => {
    // Real, existing behavior: no www-specific handling exists in this
    // implementation.
    expect(urlDedupeKey("https://www.example.com/post")).not.toBe(urlDedupeKey("https://example.com/post"));
  });

  it("returns an empty string for empty input", () => {
    expect(urlDedupeKey("")).toBe("");
  });

  it("handles a bare root path trailing slash", () => {
    expect(urlDedupeKey("https://example.com/")).toBe("https://example.com");
  });
});
