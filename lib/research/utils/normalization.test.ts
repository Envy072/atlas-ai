import { describe, it, expect } from "vitest";
import { normalizeUrl, extractDomain, normalizeQuery } from "@/lib/research/utils/normalization";

describe("normalizeUrl", () => {
  it("lowercases the hostname", () => {
    expect(normalizeUrl("https://Example.COM/post")).toBe("https://example.com/post");
  });

  it("strips a trailing slash from a non-root path", () => {
    expect(normalizeUrl("https://example.com/post/")).toBe("https://example.com/post");
  });

  it("keeps the root path's single slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("strips the hash fragment", () => {
    expect(normalizeUrl("https://example.com/post#section-2")).toBe("https://example.com/post");
  });

  it("strips a utm_ tracking parameter", () => {
    expect(normalizeUrl("https://example.com/post?utm_source=newsletter")).toBe(
      "https://example.com/post"
    );
  });

  it("strips fbclid and gclid tracking parameters", () => {
    expect(normalizeUrl("https://example.com/post?fbclid=abc&gclid=xyz")).toBe(
      "https://example.com/post"
    );
  });

  it("keeps a non-tracking query parameter", () => {
    expect(normalizeUrl("https://example.com/post?page=2")).toBe("https://example.com/post?page=2");
  });

  it("strips an exact 'ref' tracking parameter", () => {
    expect(normalizeUrl("https://example.com/post?ref=twitter")).toBe("https://example.com/post");
  });

  // Regression test for the confirmed over-matching defect (Milestone 94):
  // "ref" previously matched by prefix, silently stripping any query key
  // merely starting with those letters. Corrected to an exact match — a
  // query key that legitimately starts with "ref" but isn't the literal
  // tracking key "ref" must now be preserved.
  it("keeps a non-tracking query parameter that merely starts with 'ref'", () => {
    expect(normalizeUrl("https://example.com/post?referral_code=friend123")).toBe(
      "https://example.com/post?referral_code=friend123"
    );
    expect(normalizeUrl("https://example.com/post?refresh_token=abc123")).toBe(
      "https://example.com/post?refresh_token=abc123"
    );
  });

  it("recognizes two URLs differing only by tracking params, casing, and a trailing slash as the same normalized URL", () => {
    const withTracking = normalizeUrl("https://Example.com/post/?utm_source=newsletter&utm_medium=email");
    const withoutTracking = normalizeUrl("https://example.com/post");
    expect(withTracking).toBe(withoutTracking);
  });

  it("falls back to a trimmed, lowercased string for a malformed URL", () => {
    expect(normalizeUrl("  NOT-A-VALID-URL  ")).toBe("not-a-valid-url");
  });
});

describe("extractDomain", () => {
  it("returns the lowercased hostname", () => {
    expect(extractDomain("https://Example.com/post")).toBe("example.com");
  });

  it("strips a leading www.", () => {
    expect(extractDomain("https://www.example.com/post")).toBe("example.com");
  });

  it("falls back to a trimmed, lowercased string for a malformed URL", () => {
    expect(extractDomain("  NOT-A-VALID-URL  ")).toBe("not-a-valid-url");
  });
});

describe("normalizeQuery", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeQuery("  a scheduling app  ")).toBe("a scheduling app");
  });

  it("collapses internal whitespace runs to a single space", () => {
    expect(normalizeQuery("a   scheduling    app")).toBe("a scheduling app");
  });

  it("lowercases the result", () => {
    expect(normalizeQuery("A Scheduling App")).toBe("a scheduling app");
  });
});
