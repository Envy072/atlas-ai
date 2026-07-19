import { describe, it, expect } from "vitest";
import { buildOperationalRisk } from "@/lib/business/risk/operationalRisk";

// Milestone 57 — verifies this file's actual, current construction
// behavior: buildOperationalRisk is the one place a real OperationalRisk
// gets constructed and schema-validated; `name` is required, the rest
// optional.
describe("buildOperationalRisk", () => {
  it("threads through every provided field", () => {
    const risk = buildOperationalRisk({
      name: "Key supplier concentration",
      description: "80% of inventory sourced from a single supplier.",
      severity: "high",
    });

    expect(risk).toEqual({
      name: "Key supplier concentration",
      description: "80% of inventory sourced from a single supplier.",
      severity: "high",
    });
  });

  it("requires only `name`, leaving description and severity undefined otherwise", () => {
    const risk = buildOperationalRisk({ name: "Key supplier concentration" });

    expect(risk.name).toBe("Key supplier concentration");
    expect(risk.description).toBeUndefined();
    expect(risk.severity).toBeUndefined();
  });
});
