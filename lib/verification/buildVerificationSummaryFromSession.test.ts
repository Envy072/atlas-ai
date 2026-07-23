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

    // Two independent calls to the real, current-timestamped
    // buildVerificationSummary() — compared with generatedAt normalized
    // to the same placeholder first, since each call captures its own
    // "now" and the two can legitimately differ by a millisecond
    // (confirmed under coverage instrumentation, where the extra
    // overhead between calls made this observable). generatedAt is
    // asserted separately as a valid timestamp instead of an exact match.
    const result = buildVerificationSummaryFromSession(session)!;
    const expected = buildVerificationSummary(profile);

    expect({ ...result, generatedAt: "" }).toEqual({ ...expected, generatedAt: "" });
    expect(Date.parse(result.generatedAt)).not.toBeNaN();
  });
});
