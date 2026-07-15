import { describe, it, expect } from "vitest";
import { ProjectSchema } from "@/lib/schemas/project";
import { DecisionProfileSchema } from "@/lib/decision";
import { VerificationSummarySchema } from "@/lib/verification";
import {
  buildProjectFixture,
  buildDecisionProfileFixture,
  buildVerificationSummaryFixture,
} from "@/tests/fixtures";

// A fixture that silently drifts out of sync with a schema change must
// fail loudly here, not as a confusing failure in every test that
// imports it (MILESTONE_30_DESIGN.md Architecture, "Shared fixtures").
// Every builder already validates its own output internally
// (parseOrThrow); this smoke test independently re-checks the same
// real schemas as a second, explicit guarantee.
describe("tests/fixtures", () => {
  it("buildProjectFixture() produces a schema-valid Project", () => {
    const result = ProjectSchema.safeParse(buildProjectFixture());
    expect(result.success).toBe(true);
  });

  it("buildDecisionProfileFixture() produces a schema-valid DecisionProfile", () => {
    const result = DecisionProfileSchema.safeParse(buildDecisionProfileFixture());
    expect(result.success).toBe(true);
  });

  it("buildVerificationSummaryFixture() produces a schema-valid VerificationSummary", () => {
    const result = VerificationSummarySchema.safeParse(buildVerificationSummaryFixture());
    expect(result.success).toBe(true);
  });

  it("buildProjectFixture(overrides) applies top-level overrides and stays valid", () => {
    const project = buildProjectFixture({ overrides: { title: "Custom Fixture Title" } });

    expect(project.title).toBe("Custom Fixture Title");
    expect(ProjectSchema.safeParse(project).success).toBe(true);
  });

  it("buildProjectFixture(profileOverrides) applies a nested DecisionProfile override and stays valid", () => {
    const project = buildProjectFixture({ profileOverrides: { keyCompetitors: [] } });

    expect(project.profile.keyCompetitors).toEqual([]);
    expect(ProjectSchema.safeParse(project).success).toBe(true);
  });

  it("buildProjectFixture() produces a distinct id on every call", () => {
    const first = buildProjectFixture();
    const second = buildProjectFixture();

    expect(first.id).not.toBe(second.id);
  });
});
