import { describe, it, expect } from "vitest";
import { buildCustomerSegment } from "@/lib/market/segmentation/customerSegmentation";

// Milestone 69 — verifies this file's actual, current construction
// behavior: buildCustomerSegment is the one place a real CustomerSegment
// gets constructed and schema-validated; `name` is required, the rest
// optional. `painPoints` is the one field that defaults to a concrete
// value ([]) rather than remaining undefined when omitted.
describe("buildCustomerSegment", () => {
  it("threads through every provided field", () => {
    const segment = buildCustomerSegment({
      name: "SMB owners",
      description: "Small business owners managing scheduling manually today.",
      estimatedSizeUsd: 5_000_000,
      painPoints: ["Manual scheduling", "No-shows"],
    });

    expect(segment).toEqual({
      name: "SMB owners",
      description: "Small business owners managing scheduling manually today.",
      estimatedSizeUsd: 5_000_000,
      painPoints: ["Manual scheduling", "No-shows"],
    });
  });

  it("requires only `name`, leaving description and estimatedSizeUsd undefined otherwise", () => {
    const segment = buildCustomerSegment({ name: "SMB owners" });

    expect(segment.name).toBe("SMB owners");
    expect(segment.description).toBeUndefined();
    expect(segment.estimatedSizeUsd).toBeUndefined();
  });

  it("defaults painPoints to an empty array when omitted", () => {
    const segment = buildCustomerSegment({ name: "SMB owners" });

    expect(segment.painPoints).toEqual([]);
  });

  it("threads through an explicitly-supplied painPoints array instead of defaulting", () => {
    const segment = buildCustomerSegment({ name: "SMB owners", painPoints: ["Manual scheduling"] });

    expect(segment.painPoints).toEqual(["Manual scheduling"]);
  });
});
