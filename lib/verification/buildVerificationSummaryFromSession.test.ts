import { describe, it, expect } from "vitest";
import { buildVerificationSummaryFromSession } from "@/lib/verification/buildVerificationSummaryFromSession";
import { buildVerificationSummary } from "@/lib/verification/buildVerificationSummary";
import { buildDecisionProfileFixture } from "@/tests/fixtures/decisionProfileFixture";
import type { AnalysisSession } from "@/lib/analysis-session";

// No AnalysisSession fixture builder exists in tests/fixtures/ today, so
// this file constructs a minimal one directly — but still reuses the
// real, existing buildDecisionProfileFixture() for the one field
// (result.profile) that has a production builder, rather than
// hand-authoring a DecisionProfile too.
function buildSession(overrides: Partial<AnalysisSession> = {}): AnalysisSession {
  return {
    id: "session_1",
    executionId: "execution_1",
    title: "A subscription scheduling tool",
    startupIdea: "A subscription scheduling tool",
    state: "completed",
    progress: { completedStages: 6, percent: 100 },
    timeline: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    result: undefined,
    ...overrides,
  };
}

describe("buildVerificationSummaryFromSession", () => {
  it("returns null when the session has no result yet", () => {
    const session = buildSession({ state: "analyzing", result: undefined });

    expect(buildVerificationSummaryFromSession(session)).toBeNull();
  });

  it("returns the same VerificationSummary buildVerificationSummary produces for the session's own profile", () => {
    const profile = buildDecisionProfileFixture();
    const session = buildSession({
      result: {
        request: { startupIdea: "A subscription scheduling tool" },
        profile,
        generatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const result = buildVerificationSummaryFromSession(session);

    expect(result).toEqual(buildVerificationSummary(profile));
  });
});
