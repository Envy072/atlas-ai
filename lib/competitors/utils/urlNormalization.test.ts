import { describe, it, expect } from "vitest";
import { extractCompanyDomain } from "@/lib/competitors/utils/urlNormalization";

// Milestone 53 — verifies this file's actual, current behavior: a
// lowercased hostname with a leading "www." stripped, plus the documented
// fallback (a lowercased, trimmed raw string) when the input isn't a
// parseable URL at all.
describe("extractCompanyDomain", () => {
  it("returns the lowercased hostname for a standard URL", () => {
    expect(extractCompanyDomain("https://Acme.com/pricing")).toBe("acme.com");
  });

  it("strips a leading www.", () => {
    expect(extractCompanyDomain("https://www.acme.com")).toBe("acme.com");
  });

  it("preserves a subdomain that isn't www", () => {
    expect(extractCompanyDomain("https://blog.acme.com")).toBe("blog.acme.com");
  });

  it("falls back to a lowercased, trimmed raw string when the input is not a parseable URL", () => {
    expect(extractCompanyDomain("  Not A Url  ")).toBe("not a url");
  });
});
