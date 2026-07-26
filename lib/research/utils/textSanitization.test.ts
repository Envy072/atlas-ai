import { describe, it, expect } from "vitest";
import { sanitizeSnippet } from "@/lib/research/utils/textSanitization";

// Milestone 118 — closes Milestone 114's Critical Finding C1: Tavily and
// Brave both return snippet text as an HTML fragment (inline <strong>
// tags around matched keywords, HTML-entity-encoded punctuation), and
// nothing anywhere in the codebase ever cleaned it before persisting it
// as Evidence.evidence and rendering it verbatim in every report.
describe("sanitizeSnippet", () => {
  it("removes a <strong> tag while keeping its inner text", () => {
    expect(sanitizeSnippet("Get 1 or 3 <strong>artisan sauces</strong> delivered")).toBe(
      "Get 1 or 3 artisan sauces delivered"
    );
  });

  it("removes nested HTML tags", () => {
    expect(sanitizeSnippet("<div><strong>Bold</strong> and <em>emphasis</em></div>")).toBe(
      "Bold and emphasis"
    );
  });

  it("decodes &amp;", () => {
    expect(sanitizeSnippet("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &quot;", () => {
    expect(sanitizeSnippet("Named &quot;Best Hot Sauce&quot;")).toBe('Named "Best Hot Sauce"');
  });

  it("decodes &#x27; (hex numeric apostrophe)", () => {
    expect(sanitizeSnippet("it&#x27;s variable")).toBe("it's variable");
  });

  it("decodes &lt; and &gt;", () => {
    expect(sanitizeSnippet("5 &lt; 10 &gt; 2")).toBe("5 < 10 > 2");
  });

  it("decodes a decimal numeric entity (&#39;)", () => {
    expect(sanitizeSnippet("you&#39;re spending")).toBe("you're spending");
  });

  it("handles mixed HTML tags and plain text together", () => {
    expect(
      sanitizeSnippet("Plain text <strong>bold &amp; important</strong> more plain text.")
    ).toBe("Plain text bold & important more plain text.");
  });

  it("preserves Unicode characters (accents, CJK, emoji)", () => {
    expect(sanitizeSnippet("Café — 日本語 — 🚀 launch")).toBe("Café — 日本語 — 🚀 launch");
  });

  it("leaves a URL embedded in the snippet completely unchanged", () => {
    expect(sanitizeSnippet("Visit https://example.com/page?a=1&b=2 for more")).toBe(
      "Visit https://example.com/page?a=1&b=2 for more"
    );
  });

  it("collapses the whitespace left behind by a removed tag rather than gluing words together", () => {
    expect(sanitizeSnippet("word<strong>middle</strong>word")).toBe("word middle word");
  });

  it("preserves sentence boundaries across multiple sentences", () => {
    expect(sanitizeSnippet("First sentence. <strong>Second</strong> sentence. Third one.")).toBe(
      "First sentence. Second sentence. Third one."
    );
  });

  it("returns undefined for an empty string", () => {
    expect(sanitizeSnippet("")).toBeUndefined();
  });

  it("returns undefined for a snippet that is only tags with no real text", () => {
    expect(sanitizeSnippet("<strong></strong>")).toBeUndefined();
  });

  it("returns undefined when given undefined", () => {
    expect(sanitizeSnippet(undefined)).toBeUndefined();
  });

  it("handles malformed/unclosed HTML without throwing", () => {
    expect(sanitizeSnippet("text <strong>bold text")).toBe("text bold text");
  });

  it("leaves a stray '<' with no closing '>' as real text, since it isn't a tag", () => {
    expect(sanitizeSnippet("5 < 10 and stuff")).toBe("5 < 10 and stuff");
  });

  it("leaves an unrecognized named entity untouched rather than dropping it", () => {
    expect(sanitizeSnippet("a &madeupentity; here")).toBe("a &madeupentity; here");
  });
});
