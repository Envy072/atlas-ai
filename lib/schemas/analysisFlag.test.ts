import { describe, it, expect } from "vitest";
import { AnalysisFlagCategorySchema, CreateAnalysisFlagInputSchema, AnalysisFlagSchema } from "@/lib/schemas/analysisFlag";

describe("AnalysisFlagCategorySchema", () => {
  it("accepts every one of the seven real categories", () => {
    const categories = [
      "finding",
      "critical_risk",
      "investment_thesis",
      "recommendation",
      "verdict",
      "intelligence_data",
      "other",
    ];

    for (const category of categories) {
      expect(AnalysisFlagCategorySchema.safeParse(category).success).toBe(true);
    }
  });

  it("rejects a value outside the fixed taxonomy", () => {
    expect(AnalysisFlagCategorySchema.safeParse("fabrication").success).toBe(false);
    expect(AnalysisFlagCategorySchema.safeParse("").success).toBe(false);
  });
});

function buildValidInput(overrides: Partial<{ projectId: string; category: string; description: string }> = {}) {
  return {
    projectId: "project-1",
    category: "verdict",
    description: "The verdict cites evidence that does not support its own conclusion.",
    ...overrides,
  };
}

describe("CreateAnalysisFlagInputSchema", () => {
  it("accepts a well-formed submission", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse(buildValidInput());
    expect(result.success).toBe(true);
  });

  it("rejects a description shorter than 10 characters", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse(buildValidInput({ description: "too short" }));
    expect(result.success).toBe(false);
  });

  it("accepts a description at exactly the 10-character floor", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse(buildValidInput({ description: "0123456789" }));
    expect(result.success).toBe(true);
  });

  it("rejects a description longer than 2000 characters", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse(buildValidInput({ description: "a".repeat(2001) }));
    expect(result.success).toBe(false);
  });

  it("accepts a description at exactly the 2000-character ceiling", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse(buildValidInput({ description: "a".repeat(2000) }));
    expect(result.success).toBe(true);
  });

  it("rejects an invalid category", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse(buildValidInput({ category: "not-a-real-category" }));
    expect(result.success).toBe(false);
  });

  it("rejects a missing projectId", () => {
    const result = CreateAnalysisFlagInputSchema.safeParse({
      category: "verdict",
      description: "The verdict cites evidence that does not support its own conclusion.",
    });
    expect(result.success).toBe(false);
  });
});

describe("AnalysisFlagSchema", () => {
  it("accepts a full persisted shape, including a null reporterId", () => {
    const result = AnalysisFlagSchema.safeParse({
      id: "flag-1",
      projectId: "project-1",
      reporterId: null,
      category: "other",
      description: "General feedback about the product.",
      createdAt: "2026-07-17T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});
