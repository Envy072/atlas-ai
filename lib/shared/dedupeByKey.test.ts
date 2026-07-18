import { describe, it, expect } from "vitest";
import { dedupeByKey } from "@/lib/shared/dedupeByKey";

// The single shared implementation (Milestone 51) for what was
// previously four byte-identical, independently-written copies —
// verified byte-identical before consolidation, so these tests cover
// the one real behavior every prior copy already had.
describe("dedupeByKey", () => {
  it("returns an empty array for empty input", () => {
    expect(dedupeByKey<string>([], (item) => item)).toEqual([]);
  });

  it("returns the single element unchanged for a one-element input", () => {
    expect(dedupeByKey(["a"], (item) => item)).toEqual(["a"]);
  });

  it("removes a duplicate, keeping the first occurrence (first-wins)", () => {
    const items = [
      { id: "1", label: "first" },
      { id: "1", label: "second" },
      { id: "2", label: "third" },
    ];

    expect(dedupeByKey(items, (item) => item.id)).toEqual([
      { id: "1", label: "first" },
      { id: "2", label: "third" },
    ]);
  });

  it("preserves the original ordering of surviving elements", () => {
    const items = ["c", "a", "b", "a", "c"];

    expect(dedupeByKey(items, (item) => item)).toEqual(["c", "a", "b"]);
  });

  it("works generically over a non-string element type", () => {
    interface Widget {
      sku: string;
      quantity: number;
    }

    const items: Widget[] = [
      { sku: "A", quantity: 1 },
      { sku: "B", quantity: 2 },
      { sku: "A", quantity: 3 },
    ];

    const result = dedupeByKey(items, (item) => item.sku);

    expect(result).toEqual([
      { sku: "A", quantity: 1 },
      { sku: "B", quantity: 2 },
    ]);
  });
});
