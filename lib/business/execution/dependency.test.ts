import { describe, it, expect } from "vitest";
import { buildDependency } from "@/lib/business/execution/dependency";

// Milestone 57 — verifies this file's actual, current construction
// behavior: buildDependency is the one place a real Dependency gets
// constructed and schema-validated; `name` is required, the rest
// optional.
describe("buildDependency", () => {
  it("threads through every provided field", () => {
    const dependency = buildDependency({
      name: "AWS",
      description: "Primary cloud infrastructure provider.",
      criticality: "high",
    });

    expect(dependency).toEqual({
      name: "AWS",
      description: "Primary cloud infrastructure provider.",
      criticality: "high",
    });
  });

  it("requires only `name`, leaving description and criticality undefined otherwise", () => {
    const dependency = buildDependency({ name: "AWS" });

    expect(dependency.name).toBe("AWS");
    expect(dependency.description).toBeUndefined();
    expect(dependency.criticality).toBeUndefined();
  });
});
