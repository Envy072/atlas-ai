import { describe, it, expect } from "vitest";
import { normalizeLabel } from "@/lib/business/utils/textNormalization";

// Milestone 55 — verifies this file's actual, current behavior: trim,
// lowercase, and collapse internal whitespace.
describe("normalizeLabel", () => {
  it("lowercases and trims", () => {
    expect(normalizeLabel("  Key Supplier  ")).toBe("key supplier");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeLabel("Key   Supplier")).toBe("key supplier");
  });

  it("leaves an already-normalized label unchanged", () => {
    expect(normalizeLabel("key supplier")).toBe("key supplier");
  });
});
