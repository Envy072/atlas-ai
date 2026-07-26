import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatScore,
  formatDisplayName,
  getSafeRedirectPath,
  formatPercent,
  formatCurrencyUsd,
  formatRelativeTime,
  getBusinessSummaryHeadline,
  getProjectSummaryFields,
} from "@/lib/format";

describe("formatScore", () => {
  it("formats against the default max of 100", () => {
    expect(formatScore(72)).toBe("72/100");
  });

  it("formats against a custom max", () => {
    expect(formatScore(3, 5)).toBe("3/5");
  });
});

describe("formatDisplayName", () => {
  it("returns the local part of a normal email", () => {
    expect(formatDisplayName("eshagy7@gmail.com")).toBe("eshagy7");
  });

  it("falls back to the full email when the local part is empty", () => {
    expect(formatDisplayName("@example.com")).toBe("@example.com");
  });
});

// getSafeRedirectPath is the open-redirect guard MILESTONE_28_DESIGN.md
// introduced for /login and /signup — never automatically re-verified
// since (MILESTONE_30_DESIGN.md Deliverable 6).
describe("getSafeRedirectPath", () => {
  it("returns a genuine, same-origin relative path unchanged", () => {
    expect(getSafeRedirectPath("/dashboard", "/fallback")).toBe("/dashboard");
  });

  it("falls back when the path is null", () => {
    expect(getSafeRedirectPath(null, "/fallback")).toBe("/fallback");
  });

  it("falls back when the path is empty", () => {
    expect(getSafeRedirectPath("", "/fallback")).toBe("/fallback");
  });

  it("rejects a protocol-relative path (//)", () => {
    expect(getSafeRedirectPath("//evil.com", "/fallback")).toBe("/fallback");
  });

  it("rejects a backslash-normalization bypass (/\\)", () => {
    expect(getSafeRedirectPath("/\\evil.com", "/fallback")).toBe("/fallback");
  });

  it("rejects a path smuggling an absolute URL via ://", () => {
    expect(getSafeRedirectPath("/redirect?next=http://evil.com", "/fallback")).toBe("/fallback");
  });
});

describe("formatPercent", () => {
  it("appends a percent sign", () => {
    expect(formatPercent(50)).toBe("50%");
  });
});

// The shared fallback chain extracted at Milestone 49 — previously
// duplicated inline in app/projects/page.tsx, now also used by
// ProjectComparisonView and RecentProjectsPanel. Milestone 119 extends
// the chain (rather than replacing it) with two more real, already-
// persisted Decision Platform sources, since businessSummary's own
// valueProposition/businessModel are honestly absent on every completed
// analysis today.
describe("getBusinessSummaryHeadline", () => {
  it("prefers valueProposition when present", () => {
    expect(getBusinessSummaryHeadline({ valueProposition: "A clear value prop.", businessModel: "SaaS" })).toBe(
      "A clear value prop."
    );
  });

  it("falls back to businessModel when valueProposition is absent", () => {
    expect(getBusinessSummaryHeadline({ businessModel: "Marketplace" })).toBe("Marketplace");
  });

  it("falls back to the top key finding when businessSummary has neither field", () => {
    expect(
      getBusinessSummaryHeadline({}, [{ summary: "The market is growing." }, { summary: "A second finding." }])
    ).toBe("The market is growing.");
  });

  it("falls back to the top positive investment argument when there are no key findings either", () => {
    expect(
      getBusinessSummaryHeadline({}, [], { positiveArguments: ["Demand is real.", "A second argument."] })
    ).toBe("Demand is real.");
  });

  it("falls back to an honest 'no summary' message when nothing at all is available", () => {
    expect(getBusinessSummaryHeadline({})).toBe("No summary available.");
  });

  it("falls back to an honest 'no summary' message when findings/thesis are given but genuinely empty", () => {
    expect(getBusinessSummaryHeadline({}, [], { positiveArguments: [] })).toBe("No summary available.");
  });
});

// Milestone 119 — closes Private Beta Readiness Review Finding H1: the
// Projects list showed "Not yet known." for every single project,
// because businessSummary.customerProblem/valueProposition are always
// absent (Business Intelligence's own competitive-positioning/health
// scoring is still architecture-only). This atomically switches the
// whole labeled pair — never mixing one real curated field with a
// fallback for the other under the same "Problem"/"Solution" labels.
describe("getProjectSummaryFields", () => {
  it("shows the real curated Problem/Solution pair when BusinessSummary has both fields", () => {
    const result = getProjectSummaryFields({
      customerProblem: "Founders waste weeks on manual research.",
      valueProposition: "Atlas AI compresses that into one conversation.",
    });

    expect(result).toEqual({
      problemLabel: "Problem",
      problemValue: "Founders waste weeks on manual research.",
      solutionLabel: "Solution",
      solutionValue: "Atlas AI compresses that into one conversation.",
    });
  });

  it("falls back to the honestly-relabeled thesis/risk pair when only one curated field is present", () => {
    const result = getProjectSummaryFields(
      { customerProblem: "Founders waste weeks on manual research." },
      { positiveArguments: ["The market is growing."] },
      [{ summary: "A crowded competitive field." }]
    );

    expect(result.problemLabel).toBe("Strongest case");
    expect(result.problemValue).toBe("The market is growing.");
    expect(result.solutionLabel).toBe("Biggest risk");
    expect(result.solutionValue).toBe("A crowded competitive field.");
  });

  it("falls back to the honestly-relabeled thesis/risk pair when both curated fields are absent (today's real case)", () => {
    const result = getProjectSummaryFields(
      {},
      { positiveArguments: ["Existing subscriptions demonstrate appeal."] },
      [{ summary: "Direct competition from established players." }]
    );

    expect(result).toEqual({
      problemLabel: "Strongest case",
      problemValue: "Existing subscriptions demonstrate appeal.",
      solutionLabel: "Biggest risk",
      solutionValue: "Direct competition from established players.",
    });
  });

  it("falls back to an honest 'not yet known' when even the thesis/risk arrays are empty", () => {
    const result = getProjectSummaryFields({}, { positiveArguments: [] }, []);

    expect(result).toEqual({
      problemLabel: "Strongest case",
      problemValue: "Not yet known.",
      solutionLabel: "Biggest risk",
      solutionValue: "Not yet known.",
    });
  });

  it("falls back to an honest 'not yet known' when investmentThesis/criticalRisks are omitted entirely", () => {
    const result = getProjectSummaryFields({});

    expect(result.problemValue).toBe("Not yet known.");
    expect(result.solutionValue).toBe("Not yet known.");
  });

  it("derives each of several distinct projects' fields independently, with no shared state or cross-contamination", () => {
    const projectA = getProjectSummaryFields({}, { positiveArguments: ["Idea A's own market is growing."] }, [
      { summary: "Idea A's own biggest risk." },
    ]);
    const projectB = getProjectSummaryFields(
      { customerProblem: "Idea B's own real problem.", valueProposition: "Idea B's own real solution." },
      { positiveArguments: ["Idea B's own positive argument — must not leak into Idea A's result."] }
    );

    expect(projectA.problemValue).toBe("Idea A's own market is growing.");
    expect(projectA.solutionValue).toBe("Idea A's own biggest risk.");
    expect(projectB).toEqual({
      problemLabel: "Problem",
      problemValue: "Idea B's own real problem.",
      solutionLabel: "Solution",
      solutionValue: "Idea B's own real solution.",
    });
  });
});

describe("formatCurrencyUsd", () => {
  it("formats billions compactly", () => {
    expect(formatCurrencyUsd(1_200_000_000)).toBe("$1.2B");
  });

  it("formats millions compactly", () => {
    expect(formatCurrencyUsd(2_500_000)).toBe("$2.5M");
  });

  it("formats a small figure without a compact suffix", () => {
    // Below the compact (K/M/B) threshold, ICU implementations
    // genuinely disagree on whether to print a trailing ".0" for
    // maximumFractionDigits: 1 — confirmed directly via a real CI
    // failure (Node's bundled ICU/CLDR data differs by version): this
    // machine's Node produced "$500", GitHub Actions' Node produced
    // "$500.0". Both are correct, ICU-version-dependent renderings of
    // the same value, so the assertion accepts either rather than
    // hardcoding one environment's output. The million/billion cases
    // above are unaffected — compact notation always uses a fractional
    // digit once a K/M/B suffix applies, so there's nothing ambiguous
    // to tolerate there.
    expect(formatCurrencyUsd(500)).toMatch(/^\$500(\.0)?$/);
  });
});

// A fixed system time (vi.setSystemTime) is required here — without it
// this suite would be flaky by construction, since formatRelativeTime
// reads Date.now() internally (MILESTONE_30_DESIGN.md Risks, "Flaky
// tests").
describe("formatRelativeTime", () => {
  const NOW = new Date("2026-07-15T12:00:00.000Z");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats a few seconds in the past", () => {
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(past)).toBe("30 seconds ago");
  });

  it("formats a couple hours in the past", () => {
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(past)).toBe("2 hours ago");
  });

  it("formats a few minutes in the future", () => {
    vi.setSystemTime(NOW);
    const future = new Date(NOW.getTime() + 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(future)).toBe("in 5 minutes");
  });

  it("formats a few days in the past", () => {
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(past)).toBe("3 days ago");
  });
});
