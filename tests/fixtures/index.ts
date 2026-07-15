// Public entry point for tests/fixtures — every test importing a
// fixture builder should import from here, never from a deep path
// into a specific file, matching this codebase's own "one shape, one
// public barrel" convention already used by every lib/*/index.ts
// (MILESTONE_30_DESIGN.md Architecture, "Shared fixtures").
export { buildProjectFixture } from "@/tests/fixtures/projectFixture";
export type { BuildProjectFixtureOptions } from "@/tests/fixtures/projectFixture";
export { buildDecisionProfileFixture } from "@/tests/fixtures/decisionProfileFixture";
export { buildVerificationSummaryFixture } from "@/tests/fixtures/verificationSummaryFixture";
