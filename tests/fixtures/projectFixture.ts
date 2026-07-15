import { ProjectSchema } from "@/lib/schemas/project";
import type { Project } from "@/lib/schemas/project";
import type { DecisionProfile } from "@/lib/decision";
import { parseOrThrow } from "@/lib/validation/parse";
import { buildDecisionProfileFixture } from "@/tests/fixtures/decisionProfileFixture";
import { buildVerificationSummaryFixture } from "@/tests/fixtures/verificationSummaryFixture";

export interface BuildProjectFixtureOptions {
  overrides?: Partial<Project>;
  // Applied to the DecisionProfile this Project's profile/verification
  // are built from — e.g. `{ profileOverrides: { keyCompetitors: [] } }`
  // to construct "a Project with zero keyCompetitors" without
  // repeating the entire fixture shape (MILESTONE_30_DESIGN.md
  // Architecture, "Shared fixtures").
  profileOverrides?: Partial<DecisionProfile>;
}

let projectFixtureCounter = 0;

// overrides is re-validated through ProjectSchema before returning —
// an override that produces an invalid Project fails loudly here, at
// the fixture call site (MILESTONE_30_DESIGN.md Deliverable 4).
export function buildProjectFixture(options: BuildProjectFixtureOptions = {}): Project {
  projectFixtureCounter += 1;

  const profile = buildDecisionProfileFixture(options.profileOverrides);
  const verification = buildVerificationSummaryFixture(profile);

  const base: Project = {
    id: `fixture-project-${projectFixtureCounter}`,
    sessionId: `fixture-session-${projectFixtureCounter}`,
    executionId: `fixture-execution-${projectFixtureCounter}`,
    title: "Fixture Startup Idea",
    createdAt: new Date().toISOString(),
    ownerId: "fixture-owner-id",
    profile,
    verification,
  };

  return parseOrThrow(
    ProjectSchema,
    { ...base, ...options.overrides },
    "buildProjectFixture produced an invalid Project."
  );
}
