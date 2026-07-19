import { describe, it, expect } from "vitest";
import { normalizeLabel } from "@/lib/financial/utils/textNormalization";

// Milestone 58 — verifies this file's actual, current behavior: trim,
// lowercase, and collapse internal whitespace.
describe("normalizeLabel", () => {
  it("lowercases and trims", () => {
    expect(normalizeLabel("  Cloud Hosting  ")).toBe("cloud hosting");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeLabel("Cloud   Hosting")).toBe("cloud hosting");
  });

  it("leaves an already-normalized label unchanged", () => {
    expect(normalizeLabel("cloud hosting")).toBe("cloud hosting");
  });
});
