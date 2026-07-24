import { describe, it, expect, vi } from "vitest";

// The pipeline layer's own default store is real Supabase-backed as of
// Milestone 107 (createSession() delegates to startPipeline()
// internally, with no store parameter of its own to override). Mocked
// at the same level Milestone 106 mocked the analysis-session store's
// own default — the factory itself — with a real MemoryPipelineStore
// substituted underneath, rather than trying to simulate Supabase row
// semantics: this file's subject is ownership enforcement, not
// persistence, and a real in-memory store lets the actual pipeline
// orchestration run and be read back correctly with zero behavioral
// approximation. One shared instance for this file's whole run, exactly
// like pipelineEngine.ts's own real defaultStore binding — evaluated
// once at module load, not once per call.
vi.mock("@/lib/pipeline/storage/createStore", async () => {
  const { MemoryPipelineStore } = await import("@/lib/pipeline/storage/memoryStore");
  const store = new MemoryPipelineStore();
  return { createStore: () => store };
});

import { createSession, getSession, cancelSession, retrySession } from "@/lib/analysis-session/lifecycle/sessionLifecycle";
import { MemoryAnalysisSessionStore } from "@/lib/analysis-session/storage/memoryStore";

// Milestone 47's ownership enforcement — a fresh, isolated store per
// test (never the shared defaultStore), covering exactly the cases the
// Milestone 46 review named: an anonymous session stays open to
// anyone, a signed-in owner's session is only theirs, and a mismatch
// is indistinguishable from "doesn't exist" (never a distinguishable
// 403 — see sessionLifecycle.ts's own assertAccessible()). The real
// pipeline runs underneath these calls, same as
// tests/integration/analysis-sessions.test.ts's own established
// pattern — it completes honestly-empty and entirely offline, since no
// search-provider credentials are configured in this environment.
describe("session ownership enforcement", () => {
  it("keeps an anonymous session (ownerId: null) accessible to any caller, signed in or not", async () => {
    const store = new MemoryAnalysisSessionStore();
    const created = await createSession({ startupIdea: "An anonymous idea." }, null, store);

    const asAnonymous = await getSession(created.id, null, store);
    const asSignedIn = await getSession(created.id, "some-user", store);

    expect(asAnonymous?.id).toBe(created.id);
    expect(asSignedIn?.id).toBe(created.id);
  });

  it("lets the owning user read their own session", async () => {
    const store = new MemoryAnalysisSessionStore();
    const created = await createSession({ startupIdea: "Owned by user-1." }, "user-1", store);

    const view = await getSession(created.id, "user-1", store);

    expect(view?.id).toBe(created.id);
  });

  it("returns null (not-found, not a distinguishable 403) for a different user reading someone else's session", async () => {
    const store = new MemoryAnalysisSessionStore();
    const created = await createSession({ startupIdea: "Owned by user-1." }, "user-1", store);

    const view = await getSession(created.id, "user-2", store);

    expect(view).toBeNull();
  });

  it("returns null for an anonymous caller reading a signed-in user's session", async () => {
    const store = new MemoryAnalysisSessionStore();
    const created = await createSession({ startupIdea: "Owned by user-1." }, "user-1", store);

    const view = await getSession(created.id, null, store);

    expect(view).toBeNull();
  });

  it("throws the identical not-found error for cancelSession against another user's session", async () => {
    const store = new MemoryAnalysisSessionStore();
    const created = await createSession({ startupIdea: "Owned by user-1." }, "user-1", store);

    await expect(cancelSession(created.id, "user-2", store)).rejects.toThrow(
      `No analysis session found for id "${created.id}".`
    );
  });

  it("throws the identical not-found error for retrySession against another user's session", async () => {
    const store = new MemoryAnalysisSessionStore();
    const created = await createSession({ startupIdea: "Owned by user-1." }, "user-1", store);

    await expect(retrySession(created.id, "user-2", store)).rejects.toThrow(
      `No analysis session found for id "${created.id}".`
    );
  });

  it("throws the exact same message for a genuinely nonexistent id, so the two cases are indistinguishable", async () => {
    const store = new MemoryAnalysisSessionStore();

    await expect(cancelSession("does-not-exist", "user-2", store)).rejects.toThrow(
      'No analysis session found for id "does-not-exist".'
    );
  });
});
