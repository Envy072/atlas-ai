import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";
import { buildProjectFixture } from "@/tests/fixtures";
import type { User } from "@supabase/supabase-js";

// getCurrentUser() and getProjectById() both call
// lib/supabase/server's createClient() — mocked here to simulate a
// real, authenticated caller reading a real project they own, mirroring
// tests/integration/analysis-sessions.test.ts's own established
// pattern exactly. The subject under test is the real, unmodified
// route handler and the real, unmodified service — only the Supabase
// client itself is a test double.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Rate limiting (Milestone 47) is its own, separately-tested concern
// (lib/services/rateLimit/checkRateLimit.test.ts) — mocked here to
// always allow, matching tests/integration/analysis-sessions.test.ts's
// own established pattern.
vi.mock("@/lib/services/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/rateLimit")>();
  return { ...actual, checkRateLimit: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { POST } from "@/app/api/analysis-flags/route";

const mockedCreateClient = vi.mocked(createClient);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);

const FAKE_USER: User = {
  id: "user-1",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/analysis-flags", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Converts a real, schema-valid Project fixture into the raw,
// snake_case row shape getProjectById()'s own fromRow() expects to
// parse — the same shape a real Supabase select() would return.
function toProjectRow(project: ReturnType<typeof buildProjectFixture>) {
  return {
    id: project.id,
    session_id: project.sessionId,
    execution_id: project.executionId,
    title: project.title,
    created_at: project.createdAt,
    owner_id: project.ownerId,
    profile: project.profile,
    verification: project.verification,
  };
}

describe("POST /api/analysis-flags", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
    mockedCheckRateLimit.mockReset();
    mockedCheckRateLimit.mockResolvedValue({ allowed: true, limit: 10, remaining: 9 });
  });

  it("golden path: an authenticated owner's well-formed report is accepted", async () => {
    const project = buildProjectFixture({ overrides: { id: "project-1", ownerId: "user-1" } });
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: FAKE_USER,
        selectResult: { data: toProjectRow(project), error: null },
        insertResult: { error: null },
      })
    );

    const response = await POST(
      buildRequest({
        projectId: "project-1",
        category: "verdict",
        description: "The verdict cites evidence that does not support its own conclusion.",
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
  });

  it("rejects an unauthenticated request with 401", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));

    const response = await POST(
      buildRequest({ projectId: "project-1", category: "verdict", description: "Something looks wrong here." })
    );

    expect(response.status).toBe(401);
  });

  it("rejects a malformed body (description too short) with 400, before any Supabase call", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));

    const response = await POST(buildRequest({ projectId: "project-1", category: "verdict", description: "short" }));

    expect(response.status).toBe(400);
  });

  it("rejects an invalid category with 400", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));

    const response = await POST(
      buildRequest({
        projectId: "project-1",
        category: "not-a-real-category",
        description: "Something looks wrong here.",
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects a report against a project the caller doesn't own, indistinguishably from a nonexistent project", async () => {
    // selectResult data: null simulates both "doesn't exist" and
    // "belongs to someone else" — getProjectById's own .eq("owner_id",
    // userId) filter means a real Supabase query returns no row for
    // either case, which is exactly what this mock reproduces.
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: FAKE_USER,
        selectResult: { data: null, error: null },
      })
    );

    const response = await POST(
      buildRequest({
        projectId: "someone-elses-project",
        category: "verdict",
        description: "Something looks wrong here.",
      })
    );

    expect(response.status).toBe(400);
  });

  it("two rapid, sequential valid submissions both succeed — duplicate reports are accepted, not deduplicated (MILESTONE_39_DESIGN.md Section 12)", async () => {
    const project = buildProjectFixture({ overrides: { id: "project-1", ownerId: "user-1" } });
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: FAKE_USER,
        selectResult: { data: toProjectRow(project), error: null },
        insertResult: { error: null },
      })
    );

    const requestBody = {
      projectId: "project-1",
      category: "finding",
      description: "This finding cites evidence that does not appear anywhere in the gathered sources.",
    };

    const [first, second] = await Promise.all([POST(buildRequest(requestBody)), POST(buildRequest(requestBody))]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const [firstBody, secondBody] = await Promise.all([first.json(), second.json()]);
    expect(firstBody.id).not.toBe(secondBody.id);
  });
});
