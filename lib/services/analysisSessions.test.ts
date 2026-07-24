import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";
import { InvalidRequestError } from "@/lib/errors";

// Substitutes lib/supabase/server.ts's createClient — the one real
// external boundary this file reaches, transitively through
// persistProjectFromSession (already independently tested in
// projects.test.ts, reusing the identical mock here rather than
// inventing new infrastructure).
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// The default analysis-session store is real Supabase-backed as of
// Milestone 106 — swapped for a fresh in-memory store for this file
// only, so this file keeps validating analysisSessions.ts's own
// orchestration against the real, unmocked lib/analysis-session
// lifecycle, without depending on live Supabase credentials.
vi.mock("@/lib/analysis-session/storage/defaultStore", async () => {
  const { MemoryAnalysisSessionStore } = await import("@/lib/analysis-session/storage/memoryStore");
  return { defaultAnalysisSessionStore: new MemoryAnalysisSessionStore() };
});

import { createClient } from "@/lib/supabase/server";
import {
  startAnalysisSession,
  getAnalysisSession,
  cancelAnalysisSession,
  retryAnalysisSession,
} from "@/lib/services/analysisSessions";

const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  mockedCreateClient.mockReset();
});

// Every real collaborator below (lib/analysis-session, buildVerificationSummaryFromSession,
// persistProjectFromSession) is already independently tested elsewhere.
// These tests validate only analysisSessions.ts's own orchestration and
// contracts: that it composes {session, verification} uniformly, that it
// attempts persistence exactly when it should (never re-verifying
// persistProjectFromSession's own no-op rules, only that it's invoked
// consistently), and its own id-validation. The real pipeline runs
// unmocked underneath every call — the same established pattern
// lib/analysis-session/lifecycle/sessionLifecycle.test.ts already uses,
// since every provider degrades to "not_configured" honestly-empty and
// entirely offline with no search-provider credentials configured here.

describe("startAnalysisSession", () => {
  it("composes a view with the new session and its verification once the analysis completes", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ insertResult: { error: null } }));

    const view = await startAnalysisSession({ startupIdea: "A subscription scheduling tool" }, "user-1");

    expect(view.session.startupIdea).toBe("A subscription scheduling tool");
    expect(view.session.state).toBe("completed");
    expect(view.verification).not.toBeNull();
  });

  it("persists the completed session as a project for a real signed-in caller", async () => {
    const client = createMockSupabaseClient({ insertResult: { error: null } });
    mockedCreateClient.mockResolvedValue(client);

    await startAnalysisSession({ startupIdea: "An idea for a signed-in user" }, "user-1");

    expect(client.from).toHaveBeenCalledWith("projects");
  });

  it("does not attempt to persist an anonymous caller's completed session", async () => {
    const client = createMockSupabaseClient({ insertResult: { error: null } });
    mockedCreateClient.mockResolvedValue(client);

    await startAnalysisSession({ startupIdea: "An anonymous idea" }, null);

    expect(client.from).not.toHaveBeenCalled();
  });
});

describe("getAnalysisSession", () => {
  it("returns null for a nonexistent session id, without attempting persistence", async () => {
    const client = createMockSupabaseClient({ insertResult: { error: null } });
    mockedCreateClient.mockResolvedValue(client);

    const view = await getAnalysisSession("does-not-exist", null);

    expect(view).toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });

  it("returns the composed view for an existing session", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ insertResult: { error: null } }));

    const created = await startAnalysisSession({ startupIdea: "An idea to look up" }, "user-1");
    const view = await getAnalysisSession(created.session.id, "user-1");

    expect(view?.session.id).toBe(created.session.id);
    expect(view?.verification).not.toBeNull();
  });
});

describe("cancelAnalysisSession", () => {
  it("rejects an empty session id before ever delegating to the session lifecycle", async () => {
    await expect(cancelAnalysisSession("   ", null)).rejects.toThrow(InvalidRequestError);
  });

  it("composes a view around the result of delegating to the session lifecycle", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ insertResult: { error: null } }));

    const created = await startAnalysisSession({ startupIdea: "An idea to cancel" }, "user-1");
    const view = await cancelAnalysisSession(created.session.id, "user-1");

    expect(view.session.id).toBe(created.session.id);
  });
});

describe("retryAnalysisSession", () => {
  it("rejects an empty session id before ever delegating to the session lifecycle", async () => {
    await expect(retryAnalysisSession("", null)).rejects.toThrow(InvalidRequestError);
  });
});
