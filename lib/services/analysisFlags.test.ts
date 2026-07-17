import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";
import { buildProjectFixture } from "@/tests/fixtures";
import type { CreateAnalysisFlagInput } from "@/lib/schemas/analysisFlag";

// submitAnalysisFlag()'s first-ever test (MILESTONE_39_DESIGN.md
// Deliverable). Mocks getProjectById() directly — one layer up, the
// one thing besides Supabase this file talks to — mirroring this
// codebase's own established "mock the one thing this file talks to"
// philosophy (e.g. riskFinding.test.ts, recommendationGenerator.test.ts).
// Mocks lib/supabase/server's createClient() for the insert itself,
// reusing the existing createMockSupabaseClient() test infrastructure
// unmodified.

vi.mock("@/lib/services/projects", () => ({ getProjectById: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { getProjectById } from "@/lib/services/projects";
import { createClient } from "@/lib/supabase/server";
import { submitAnalysisFlag } from "@/lib/services/analysisFlags";

const mockedGetProjectById = vi.mocked(getProjectById);
const mockedCreateClient = vi.mocked(createClient);

function buildInput(overrides: Partial<CreateAnalysisFlagInput> = {}): CreateAnalysisFlagInput {
  return {
    projectId: "project-1",
    category: "verdict",
    description: "The verdict cites evidence that does not support its own conclusion.",
    ...overrides,
  };
}

afterEach(() => {
  mockedGetProjectById.mockReset();
  mockedCreateClient.mockReset();
});

describe("submitAnalysisFlag", () => {
  it("throws InvalidRequestError when the project doesn't exist or isn't owned by the caller", async () => {
    mockedGetProjectById.mockResolvedValue(null);

    await expect(submitAnalysisFlag(buildInput(), "user-1")).rejects.toThrow(/could not be found/i);

    expect(mockedGetProjectById).toHaveBeenCalledWith("project-1", "user-1");
    // Never even attempts to construct a Supabase client for the write
    // once ownership fails — confirms the ownership check runs first.
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("inserts a real row and returns a schema-valid AnalysisFlag on success", async () => {
    const project = buildProjectFixture({ overrides: { id: "project-1" } });
    mockedGetProjectById.mockResolvedValue(project);
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ insertResult: { error: null } }));

    const input = buildInput();
    const result = await submitAnalysisFlag(input, "user-1");

    expect(result).toMatchObject({
      projectId: "project-1",
      reporterId: "user-1",
      category: "verdict",
      description: input.description,
    });
    expect(result.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(result.createdAt))).toBe(false);
  });

  it("throws ExternalServiceError when the Supabase insert fails", async () => {
    const project = buildProjectFixture({ overrides: { id: "project-1" } });
    mockedGetProjectById.mockResolvedValue(project);
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ insertResult: { error: { message: "connection refused" } } })
    );

    await expect(submitAnalysisFlag(buildInput(), "user-1")).rejects.toThrow(/could not submit/i);
  });
});
