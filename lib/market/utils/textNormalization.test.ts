import { describe, it, expect } from "vitest";
import { normalizeIndustryName, tokenize } from "@/lib/market/utils/textNormalization";

// Milestone 61 — verifies this file's actual, current behavior.
describe("normalizeIndustryName", () => {
  it("lowercases and trims", () => {
    expect(normalizeIndustryName("  FinTech  ")).toBe("fintech");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeIndustryName("Fin   Tech")).toBe("fin tech");
  });

  it("leaves an already-normalized name unchanged", () => {
    expect(normalizeIndustryName("fintech")).toBe("fintech");
  });
});

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumeric characters", () => {
    expect(tokenize("Payment Processing, Inc.")).toEqual(new Set(["payment", "processing", "inc"]));
  });

  it("filters out tokens of length 2 or fewer, keeping tokens of length 3 or more", () => {
    expect(tokenize("an app for us")).toEqual(new Set(["app", "for"]));
  });

  it("deduplicates repeated tokens", () => {
    expect(tokenize("payments payments")).toEqual(new Set(["payments"]));
  });
});
