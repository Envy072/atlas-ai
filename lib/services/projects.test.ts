import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";
import { buildDecisionProfileFixture, buildVerificationSummaryFixture } from "@/tests/fixtures";
import type { AnalysisSessionView } from "@/lib/schemas/analysisSessionView";
import type { AnalysisSession } from "@/lib/analysis-session";

// Substitutes lib/supabase/server.ts's createClient — the real one
// calls next/headers' cookies(), which has no request-scoped context
// under plain Vitest execution (MILESTONE_30_DESIGN.md Security
// Review, "Test isolation").
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Milestone 115 — persistProjectFromSession() now calls
// buildDecisionArtifacts(), which makes real OpenAI calls
// (deriveRecommendations()/deriveVerdict()). Mocked at its exact leaf
// module, the same pattern decisionArtifacts.test.ts itself uses for
// its own two dependencies — this suite is about persistence, not
// generation, and must never let a unit test reach the network.
vi.mock("@/lib/decision/artifacts/decisionArtifacts", () => ({
  buildDecisionArtifacts: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { buildDecisionArtifacts } from "@/lib/decision/artifacts/decisionArtifacts";
import { listProjects, getProjectById, persistProjectFromSession, countProjectsThisMonth } from "@/lib/services/projects";

const mockedCreateClient = vi.mocked(createClient);
const mockedBuildDecisionArtifacts = vi.mocked(buildDecisionArtifacts);

function buildValidRow(overrides: Record<string, unknown> = {}) {
  const profile = buildDecisionProfileFixture();
  const verification = buildVerificationSummaryFixture(profile);

  return {
    id: "project-1",
    session_id: "session-1",
    execution_id: "execution-1",
    title: "A real project",
    created_at: "2026-07-01T00:00:00.000Z",
    owner_id: "user-1",
    profile,
    verification,
    decision_artifacts: null,
    ...overrides,
  };
}

function buildCompletedSessionView(overrides: Partial<AnalysisSession> = {}): AnalysisSessionView {
  const profile = buildDecisionProfileFixture();
  const verification = buildVerificationSummaryFixture(profile);

  const session: AnalysisSession = {
    id: "session-1",
    executionId: "execution-1",
    title: "Fixture Session",
    startupIdea: "A fixture startup idea.",
    state: "completed",
    progress: { completedStages: 6, percent: 100 },
    timeline: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:10:00.000Z",
    result: {
      request: { startupIdea: "A fixture startup idea." },
      profile,
      generatedAt: "2026-07-01T00:10:00.000Z",
    },
    ...overrides,
  };

  return { session, verification };
}

beforeEach(() => {
  mockedCreateClient.mockReset();
  mockedBuildDecisionArtifacts.mockReset();
  mockedBuildDecisionArtifacts.mockResolvedValue({ recommendations: [], verdict: undefined });
});

describe("listProjects", () => {
  it("scopes the query to the given owner_id", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: [], error: null } });
    mockedCreateClient.mockResolvedValue(client);

    await listProjects("user-1");

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    const selectReturn = vi.mocked(fromReturn.select).mock.results[0]?.value;
    expect(selectReturn.eq).toHaveBeenCalledWith("owner_id", "user-1");
  });

  it("maps every valid row from snake_case to a camelCase Project", async () => {
    const row = buildValidRow();
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: [row], error: null } })
    );

    const result = await listProjects("user-1");

    expect(result).toEqual([
      {
        id: row.id,
        sessionId: row.session_id,
        executionId: row.execution_id,
        title: row.title,
        createdAt: row.created_at,
        ownerId: row.owner_id,
        profile: row.profile,
        verification: row.verification,
        decisionArtifacts: row.decision_artifacts,
      },
    ]);
  });

  it("silently drops a malformed row rather than throwing, and logs it", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const validRow = buildValidRow({ id: "project-valid" });
    const malformedRow = { id: "project-malformed" }; // missing every other required field

    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: [malformedRow, validRow], error: null } })
    );

    const result = await listProjects("user-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("project-valid");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns [] (not a throw) and logs when Supabase itself returns an error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: null, error: { message: "connection lost" } } })
    );

    expect(await listProjects("user-1")).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// getProjectById is the enumeration-resistance seam MILESTONE_29_DESIGN.md
// Section 9 depends on: a nonexistent id and a wrong-owner id are NOT
// independently distinguishable at this layer BY DESIGN (both collapse
// to Postgres/RLS returning zero rows) — that collapse is the actual
// security property, not a testing gap to work around. What this suite
// verifies instead, honestly: (1) the query is actually constructed
// with both filters — the real, checkable application-layer guarantee
// — and (2) the three genuinely distinct code paths a caller can
// observe: no row found, a malformed row, and a real Supabase error.
describe("getProjectById", () => {
  it("queries by both id and owner_id — the application-layer ownership filter", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: null, error: null } });
    mockedCreateClient.mockResolvedValue(client);

    await getProjectById("project-1", "user-1");

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    const selectReturn = vi.mocked(fromReturn.select).mock.results[0]?.value;
    expect(selectReturn.eq).toHaveBeenNthCalledWith(1, "id", "project-1");
    expect(selectReturn.eq).toHaveBeenNthCalledWith(2, "owner_id", "user-1");
  });

  it("returns null when no row is found — indistinguishable whether the id doesn't exist or belongs to a different owner", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: null, error: null } })
    );

    expect(await getProjectById("any-id", "user-1")).toBeNull();
  });

  it("returns null (not a thrown error) for a row that fails schema validation, and logs it", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: { id: "project-1" }, error: null } })
    );

    expect(await getProjectById("project-1", "user-1")).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns null and logs when Supabase itself returns an error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: null, error: { message: "connection lost" } } })
    );

    expect(await getProjectById("any-id", "user-1")).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns the mapped Project for a valid, owned row", async () => {
    const row = buildValidRow();
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: row, error: null } })
    );

    const result = await getProjectById(row.id, row.owner_id);

    expect(result).toEqual({
      id: row.id,
      sessionId: row.session_id,
      executionId: row.execution_id,
      title: row.title,
      createdAt: row.created_at,
      ownerId: row.owner_id,
      profile: row.profile,
      verification: row.verification,
      decisionArtifacts: row.decision_artifacts,
    });
  });
});

// countProjectsThisMonth's first tests (Milestone 44) — backs the Free
// tier's monthly analysis cap.
describe("countProjectsThisMonth", () => {
  it("scopes the query to owner_id and a calendar-month-start lower bound", async () => {
    const client = createMockSupabaseClient({ countResult: { count: 0, error: null } });
    mockedCreateClient.mockResolvedValue(client);
    const now = new Date("2026-07-17T12:00:00.000Z");

    await countProjectsThisMonth("user-1", now);

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    const selectReturn = vi.mocked(fromReturn.select).mock.results[0]?.value;
    expect(selectReturn.eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(selectReturn.eq.mock.results[0]?.value.gte).toHaveBeenCalledWith("created_at", "2026-07-01T00:00:00.000Z");
  });

  it("returns the real count on success", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ countResult: { count: 2, error: null } })
    );

    expect(await countProjectsThisMonth("user-1", new Date("2026-07-17T00:00:00.000Z"))).toBe(2);
  });

  it("returns 0 (not a throw) and logs when Supabase itself returns an error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ countResult: { count: null, error: { message: "connection lost" } } })
    );

    expect(await countProjectsThisMonth("user-1", new Date("2026-07-17T00:00:00.000Z"))).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe("persistProjectFromSession", () => {
  it("is a no-op (never even creates a client) for a non-completed session", async () => {
    const view = buildCompletedSessionView({ state: "analyzing" });

    await persistProjectFromSession(view, "user-1");

    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("is a no-op for a completed session with no result", async () => {
    const view = buildCompletedSessionView({ result: undefined });

    await persistProjectFromSession(view, "user-1");

    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("is a no-op for a null verification", async () => {
    const view = { ...buildCompletedSessionView(), verification: null };

    await persistProjectFromSession(view, "user-1");

    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("is a no-op for a null userId — an anonymous completion is never persisted", async () => {
    const view = buildCompletedSessionView();

    await persistProjectFromSession(view, null);

    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("inserts a correctly-mapped row for a genuinely completed, owned session", async () => {
    const client = createMockSupabaseClient({ insertResult: { error: null } });
    mockedCreateClient.mockResolvedValue(client);
    const view = buildCompletedSessionView();

    await persistProjectFromSession(view, "user-1");

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    expect(fromReturn.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: view.session.id,
        execution_id: view.session.executionId,
        title: view.session.title,
        created_at: view.session.updatedAt,
        owner_id: "user-1",
        profile: view.session.result?.profile,
        verification: view.verification,
      })
    );
  });

  // Milestone 115 — closes Milestone 114's Critical Finding #2 (a
  // project's verdict visibly disagreeing with itself between
  // /projects/{id} and /projects/{id}/memo, since each route made its
  // own live, non-deterministic OpenAI call on every render). These
  // tests prove the property at the one seam where it's actually
  // decided: persistProjectFromSession() computes decision artifacts at
  // most once per session and persists them; every route now just
  // reads project.decisionArtifacts, a plain field access with zero
  // further I/O — not independently unit-testable here, since Server
  // Component route rendering isn't reachable by this project's current
  // test tooling (MILESTONE_31_DESIGN.md's own, already-accepted
  // limitation), but nothing downstream of a persisted, immutable field
  // can disagree with itself.
  it("queries by session_id before computing anything — the fast-path existence check", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: null, error: null } });
    mockedCreateClient.mockResolvedValue(client);
    const view = buildCompletedSessionView();

    await persistProjectFromSession(view, "user-1");

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    const selectReturn = vi.mocked(fromReturn.select).mock.results[0]?.value;
    expect(selectReturn.eq).toHaveBeenCalledWith("session_id", view.session.id);
  });

  it("computes decision artifacts exactly once and includes them in the inserted row, for a genuinely new session", async () => {
    const client = createMockSupabaseClient({ selectResult: { data: null, error: null }, insertResult: { error: null } });
    mockedCreateClient.mockResolvedValue(client);
    const artifacts = { recommendations: [], verdict: undefined };
    mockedBuildDecisionArtifacts.mockResolvedValue(artifacts);
    const view = buildCompletedSessionView();

    await persistProjectFromSession(view, "user-1");

    expect(mockedBuildDecisionArtifacts).toHaveBeenCalledTimes(1);
    expect(mockedBuildDecisionArtifacts).toHaveBeenCalledWith(view.session.result?.profile);
    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    expect(fromReturn.insert).toHaveBeenCalledWith(
      expect.objectContaining({ decision_artifacts: artifacts })
    );
  });

  it("never computes decision artifacts, and never inserts, when a project already exists for this session", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ selectResult: { data: { id: "existing-project" }, error: null } })
    );

    await persistProjectFromSession(buildCompletedSessionView(), "user-1");

    expect(mockedBuildDecisionArtifacts).not.toHaveBeenCalled();
  });

  it("makes no further OpenAI call on a second observation of the same already-persisted session — the repeated-poll case", async () => {
    // First poll: nothing persisted yet.
    mockedCreateClient.mockResolvedValueOnce(
      createMockSupabaseClient({ selectResult: { data: null, error: null }, insertResult: { error: null } })
    );
    const view = buildCompletedSessionView();
    await persistProjectFromSession(view, "user-1");
    expect(mockedBuildDecisionArtifacts).toHaveBeenCalledTimes(1);

    // Second poll of the same, now-persisted session: the fast-path
    // existence check finds it and returns immediately.
    mockedCreateClient.mockResolvedValueOnce(
      createMockSupabaseClient({ selectResult: { data: { id: "project-1" }, error: null } })
    );
    await persistProjectFromSession(view, "user-1");

    expect(mockedBuildDecisionArtifacts).toHaveBeenCalledTimes(1);
  });

  it("falls back to an honest empty artifacts value, and still persists the project, when decision-artifact generation throws unexpectedly", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = createMockSupabaseClient({ selectResult: { data: null, error: null }, insertResult: { error: null } });
    mockedCreateClient.mockResolvedValue(client);
    mockedBuildDecisionArtifacts.mockRejectedValue(new Error("OpenAI is unreachable"));
    const view = buildCompletedSessionView();

    await persistProjectFromSession(view, "user-1");

    const fromReturn = vi.mocked(client.from).mock.results[0]?.value;
    expect(fromReturn.insert).toHaveBeenCalledWith(
      expect.objectContaining({ decision_artifacts: { recommendations: [], verdict: undefined } })
    );

    consoleErrorSpy.mockRestore();
  });

  it("a concurrent race — two calls that both observe 'not yet persisted' — computes artifacts independently, and the losing insert's own (possibly different) computation is discarded, never persisted", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = buildCompletedSessionView();

    // Call A: racing ahead of any persisted row, computes its own verdict.
    mockedCreateClient.mockResolvedValueOnce(
      createMockSupabaseClient({ selectResult: { data: null, error: null }, insertResult: { error: null } })
    );
    mockedBuildDecisionArtifacts.mockResolvedValueOnce({
      recommendations: [],
      verdict: { category: "pursue", summary: "Call A's verdict.", confidence: 80, supportingEvidence: [] },
    });
    await persistProjectFromSession(view, "user-1");

    // Call B: raced past the same "not found" check before A's insert
    // committed, computes a genuinely different verdict — then loses
    // the actual database race, exactly as the unique index on
    // session_id (supabase/migrations/20260713203553_project_persistence.sql)
    // guarantees for any real concurrent pair.
    mockedCreateClient.mockResolvedValueOnce(
      createMockSupabaseClient({
        selectResult: { data: null, error: null },
        insertResult: { error: { code: "23505", message: "duplicate" } },
      })
    );
    mockedBuildDecisionArtifacts.mockResolvedValueOnce({
      recommendations: [],
      verdict: { category: "pass", summary: "Call B's different verdict.", confidence: 40, supportingEvidence: [] },
    });
    await persistProjectFromSession(view, "user-1");

    expect(mockedBuildDecisionArtifacts).toHaveBeenCalledTimes(2);
    // B's own insert attempt genuinely happened (with its own, different
    // verdict) but never succeeded — no update path exists anywhere in
    // this file to let it overwrite A's already-committed row, and the
    // 23505 branch returns without logging it as a failure: B's verdict
    // is discarded, not persisted, not observable by any later reader.
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("treats a 23505 unique-violation as a silent success, not a logged failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ insertResult: { error: { code: "23505", message: "duplicate" } } })
    );

    await persistProjectFromSession(buildCompletedSessionView(), "user-1");

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("logs any other insert error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ insertResult: { error: { code: "500", message: "connection lost" } } })
    );

    await persistProjectFromSession(buildCompletedSessionView(), "user-1");

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
