import { describe, it, expect } from "vitest";
import { deriveBusinessModelFields } from "@/lib/business/model/businessModelSynthesis";
import type { CustomerSegment } from "@/lib/market";

function buildSegment(overrides: Partial<CustomerSegment> = {}): CustomerSegment {
  return {
    name: "SMB owners",
    painPoints: [],
    ...overrides,
  };
}

// Milestone 55 — verifies this file's actual, current behavior: real
// passthrough of already-discovered Market/Financial platform data, never
// a fabricated narrative.
describe("deriveBusinessModelFields", () => {
  it("passes the revenue model through as businessModel", () => {
    const result = deriveBusinessModelFields({ revenueModel: "subscription" });
    expect(result.businessModel).toBe("subscription");
  });

  it("passes customer segments through unchanged", () => {
    const segments = [buildSegment({ name: "SMB owners" })];
    const result = deriveBusinessModelFields({ customerSegments: segments });
    expect(result.customerSegments).toEqual(segments);
  });

  it("defaults customerSegments to an empty array when omitted", () => {
    const result = deriveBusinessModelFields({});
    expect(result.customerSegments).toEqual([]);
  });

  it("passes the revenue strategy rationale through as revenueStrategy", () => {
    const result = deriveBusinessModelFields({ revenueStrategyRationale: "Land-and-expand via free tier" });
    expect(result.revenueStrategy).toBe("Land-and-expand via free tier");
  });

  it("leaves businessModel and revenueStrategy undefined when not supplied", () => {
    const result = deriveBusinessModelFields({});
    expect(result.businessModel).toBeUndefined();
    expect(result.revenueStrategy).toBeUndefined();
  });
});
