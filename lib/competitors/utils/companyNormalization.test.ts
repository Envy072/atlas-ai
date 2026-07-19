import { describe, it, expect } from "vitest";
import { normalizeCompanyName, tokenizeCompanyName } from "@/lib/competitors/utils/companyNormalization";

// Milestone 53 — verifies this file's actual, current behavior: lowercase,
// strip non-alphanumeric punctuation, collapse whitespace, and drop a
// single trailing legal suffix (case-insensitive, optional trailing dot).
describe("normalizeCompanyName", () => {
  it("lowercases and trims", () => {
    expect(normalizeCompanyName("  Acme  ")).toBe("acme");
  });

  it("strips a trailing legal suffix with a comma and period", () => {
    expect(normalizeCompanyName("HubSpot, Inc.")).toBe("hubspot");
  });

  it("strips a trailing legal suffix with no punctuation at all", () => {
    expect(normalizeCompanyName("Acme Corp")).toBe("acme");
  });

  it("strips punctuation that isn't a legal suffix", () => {
    expect(normalizeCompanyName("Ben & Jerry's!")).toBe("ben jerrys");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeCompanyName("Hub   Spot")).toBe("hub spot");
  });

  it("does not strip a legal-suffix-like word that isn't trailing", () => {
    expect(normalizeCompanyName("Corp Solutions")).toBe("corp solutions");
  });

  it("leaves a name with no legal suffix unchanged apart from casing", () => {
    expect(normalizeCompanyName("Salesforce")).toBe("salesforce");
  });
});

describe("tokenizeCompanyName", () => {
  it("returns a set of the normalized name's whitespace-separated tokens", () => {
    expect(tokenizeCompanyName("Acme Ventures")).toEqual(new Set(["acme", "ventures"]));
  });

  it("returns a single-element set for a one-word name", () => {
    expect(tokenizeCompanyName("HubSpot Inc.")).toEqual(new Set(["hubspot"]));
  });

  it("deduplicates repeated tokens", () => {
    expect(tokenizeCompanyName("Acme Acme")).toEqual(new Set(["acme"]));
  });
});
