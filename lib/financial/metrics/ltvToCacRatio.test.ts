import { describe, it, expect } from "vitest";
import { computeLtvToCacRatio } from "@/lib/financial/metrics/ltvToCacRatio";
import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";

// Milestone 58 — the one genuinely real computation function in this
// batch (unlike economics/'s placeholders): verifies its actual, current
// branches — both inputs known, either input unknown, and the explicit
// zero-CAC guard against division by zero.
describe("computeLtvToCacRatio", () => {
  it("computes the ratio, rounded to two decimals, when both LTV and CAC are known", () => {
    const ltv: FinancialEstimate = { value: 1200, unit: "usd" };
    const cac: FinancialEstimate = { value: 400, unit: "usd" };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.value).toBe(3);
    expect(result.unit).toBe("ratio");
    expect(result.methodology).toBe("LTV ÷ CAC, computed directly from both known estimates.");
  });

  it("rounds to two decimal places", () => {
    const ltv: FinancialEstimate = { value: 100 };
    const cac: FinancialEstimate = { value: 3 };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.value).toBe(33.33);
  });

  it("takes the lower of the two confidences when both are present", () => {
    const ltv: FinancialEstimate = { value: 100, confidence: 80 };
    const cac: FinancialEstimate = { value: 20, confidence: 60 };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.confidence).toBe(60);
  });

  it("leaves confidence undefined when either input lacks one", () => {
    const ltv: FinancialEstimate = { value: 100, confidence: 80 };
    const cac: FinancialEstimate = { value: 20 };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.confidence).toBeUndefined();
  });

  it("returns an honest unknown estimate when LTV is not yet known", () => {
    const ltv: FinancialEstimate = { methodology: "not yet computed" };
    const cac: FinancialEstimate = { value: 400 };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.value).toBeUndefined();
    expect(result.methodology).toBe("LTV ÷ CAC — cannot be computed until both LTV and CAC are known.");
  });

  it("returns an honest unknown estimate when CAC is not yet known", () => {
    const ltv: FinancialEstimate = { value: 1200 };
    const cac: FinancialEstimate = { methodology: "not yet computed" };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.value).toBeUndefined();
  });

  it("guards against division by zero when CAC is exactly zero", () => {
    const ltv: FinancialEstimate = { value: 1200 };
    const cac: FinancialEstimate = { value: 0 };

    const result = computeLtvToCacRatio(ltv, cac);

    expect(result.value).toBeUndefined();
    expect(result.methodology).toBe("LTV ÷ CAC is undefined when CAC is exactly zero.");
  });
});
