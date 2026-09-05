import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";

// getCurrentUser() (called by both routes below, since this route
// family stays public for anonymous callers) reads next/headers'
// cookies(), which has no request-scoped context under plain Vitest
// execution and throws if actually invoked — confirmed directly by
// running an unmocked probe before writing this file. Mocked here to
// simulate the ordinary anonymous caller this route already supports.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// The default analysis-session store is real Supabase-backed as of
// Milestone 106 (Milestone 104A ADR Decision 4) — no longer the
// dependency-free in-memory default this file's own comment used to
// rely on (MILESTONE_30_DESIGN.md Architecture, "No mock needed for
// lib/analysis-session's store," now superseded). Swapped for a fresh
// in-memory store for this file only, so the actual subject under
// test — the real, unmodified route handlers and the real
// lib/analysis-session lifecycle — stays real; only the durability
// backend, which this file was never testing, is substituted.
vi.mock("@/lib/analysis-session/storage/defaultStore", async () => {
  const { MemoryAnalysisSessionStore } = await import("@/lib/analysis-session/storage/memoryStore");
  return { defaultAnalysisSessionStore: new MemoryAnalysisSessionStore() };
});

// The pipeline layer's own default store is real Supabase-backed as of
// Milestone 107, with no store parameter of its own for the route to
// override the way it can for the analysis-session store above. Mocked
// at the factory level with a real MemoryPipelineStore underneath, for
// the same reason as above — this file's subject is the route/lifecycle
// composition, not persistence.
vi.mock("@/lib/pipeline/storage/createStore", async () => {
  const { MemoryPipelineStore } = await import("@/lib/pipeline/storage/memoryStore");
  const store = new MemoryPipelineStore();
  return { createStore: () => store };
});

// The default market/competitor stores are real Supabase-backed as of
// Milestone 125 (previously in-memory) — the decision stage reaches
// them transitively through synthesizeDecision's own
// resolveMarketKnowledge/resolveCompetitorKnowledge calls. Without this,
// that real Supabase call fails in this test environment, the decision
// stage exhausts its auto-retries, and every session in this file lands
// on "stage_failed" instead of "completed" — invisible to every
// pre-existing test here (none asserted on `state`), but exactly the
// gap this file's own cancel/retry tests below depend on being closed.
// Mirrors lib/pipeline/engine/pipelineEngine.recovery.test.ts's own
// identical mock.
vi.mock("@/lib/market/storage/createStore", async () => {
  const { MemoryMarketStore } = await import("@/lib/market/storage/memoryStore");
  const store = new MemoryMarketStore();
  return { createStore: () => store };
});

vi.mock("@/lib/competitors/storage/createStore", async () => {
  const { MemoryCompetitorStore } = await import("@/lib/competitors/storage/memoryStore");
  const store = new MemoryCompetitorStore();
  return { createStore: () => store };
});

// Milestone 44's monthly-limit check: getUserTier()/countProjectsThisMonth()'s
// own internal correctness is already covered by their real unit tests
// (lib/services/stripe.test.ts, lib/services/projects.test.ts) — mocked
// directly here so this file's job stays narrow: proving the route
// itself composes them into the correct HTTP response, not
// re-verifying their internals a second time. Every other export from
// each module (including persistProjectFromSession, which the golden
// path below still exercises for real) stays real via importOriginal.
vi.mock("@/lib/services/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/stripe")>();
  return { ...actual, getUserTier: vi.fn() };
});
vi.mock("@/lib/services/projects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/projects")>();
  return { ...actual, countProjectsThisMonth: vi.fn() };
});

// Rate limiting (Milestone 47) is its own, separately-tested concern
// (lib/services/rateLimit/checkRateLimit.test.ts) — mocked here to
// always allow, so this file stays focused on proving the route
// composes session creation/lookup correctly, not re-verifying the
// limiter's own internals a second time.
vi.mock("@/lib/services/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/rateLimit")>();
  return { ...actual, checkRateLimit: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/services/stripe";
import { countProjectsThisMonth } from "@/lib/services/projects";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { POST } from "@/app/api/analysis-sessions/route";
import { GET } from "@/app/api/analysis-sessions/[id]/route";
import { POST as cancelPOST } from "@/app/api/analysis-sessions/[id]/cancel/route";
import { POST as retryPOST } from "@/app/api/analysis-sessions/[id]/retry/route";
import type { User } from "@supabase/supabase-js";

const mockedCreateClient = vi.mocked(createClient);
const mockedGetUserTier = vi.mocked(getUserTier);
const mockedCountProjectsThisMonth = vi.mocked(countProjectsThisMonth);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);

const FAKE_USER: User = {
  id: "user-1",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
} as User;

beforeEach(() => {
  mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));
  mockedGetUserTier.mockReset();
  mockedCountProjectsThisMonth.mockReset();
  mockedCheckRateLimit.mockReset();
  mockedCheckRateLimit.mockResolvedValue({ allowed: true, limit: 100, remaining: 99 });
});

function buildCreateRequest(body: unknown): Request {
  return new Request("http://localhost/api/analysis-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildGetRequest(id: string): { req: Request; context: { params: Promise<{ id: string }> } } {
  return {
    req: new Request(`http://localhost/api/analysis-sessions/${id}`),
    context: { params: Promise.resolve({ id }) },
  };
}

// cancel/retry are both POST, same request shape as buildGetRequest's
// GET counterpart but with a method — no body, since both routes read
// only the id from the URL params.
function buildMutateRequest(id: string): { req: Request; context: { params: Promise<{ id: string }> } } {
  return {
    req: new Request(`http://localhost/api/analysis-sessions/${id}`, { method: "POST" }),
    context: { params: Promise.resolve({ id }) },
  };
}

// This actually runs the full, real, six-stage pipeline synchronously
// within the POST call (lib/pipeline's own startPipeline awaits every
// stage before returning) — never mocked, and never a real network
// call: every research provider checks its own API key first and
// returns "not_configured" immediately when absent (confirmed by
// direct read of lib/research/providers/braveProvider.ts), and this
// environment's own .env.local has no search-provider credentials
// configured at all. The pipeline therefore completes honestly-empty,
// entirely offline, exactly as it already behaves in this dev
// environment today — not a special test-only path.
describe("POST /api/analysis-sessions → GET /api/analysis-sessions/:id", () => {
  it("golden path: a created session is immediately readable by id", async () => {
    const createResponse = await POST(buildCreateRequest({ startupIdea: "A real-time carpool matcher." }));
    expect(createResponse.status).toBe(201);

    const created = await createResponse.json();
    expect(created.session.id).toBeTruthy();

    const { req, context } = buildGetRequest(created.session.id);
    const getResponse = await GET(req, context);

    expect(getResponse.status).toBe(200);
    const fetched = await getResponse.json();
    expect(fetched.session.id).toBe(created.session.id);
    expect(fetched.session.startupIdea).toBe("A real-time carpool matcher.");
  });

  it("rejects an empty startupIdea with 400", async () => {
    const response = await POST(buildCreateRequest({ startupIdea: "" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("A valid startupIdea is required to start an analysis.");
  });

  it("rejects a missing startupIdea field with 400", async () => {
    const response = await POST(buildCreateRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("A valid startupIdea is required to start an analysis.");
  });

  it("returns the app's documented not-found response for a nonexistent session id", async () => {
    const { req, context } = buildGetRequest("session-does-not-exist");
    const response = await GET(req, context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No analysis session found for id "session-does-not-exist".');
  });

  it("rejects a signed-in Free tier user who has reached the monthly analysis cap with 403", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));
    mockedGetUserTier.mockResolvedValue("free");
    mockedCountProjectsThisMonth.mockResolvedValue(2);

    const response = await POST(buildCreateRequest({ startupIdea: "One idea too many this month." }));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("You've reached your Free tier's monthly analysis limit.");
  });

  it("still creates a session for a signed-in Free tier user under the monthly cap", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));
    mockedGetUserTier.mockResolvedValue("free");
    mockedCountProjectsThisMonth.mockResolvedValue(1);

    const response = await POST(buildCreateRequest({ startupIdea: "Still within this month's limit." }));

    expect(response.status).toBe(201);
  });

  it("never checks the monthly cap for a signed-in Founder tier user", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: FAKE_USER }));
    mockedGetUserTier.mockResolvedValue("founder");

    const response = await POST(buildCreateRequest({ startupIdea: "Founders are unlimited." }));

    expect(response.status).toBe(201);
    expect(mockedCountProjectsThisMonth).not.toHaveBeenCalled();
  });
});

// The pipeline runs synchronously to completion inside POST (same
// comment as the describe block above), so a session created via this
// file's own POST helper is always already terminal ("completed", since
// no research provider credentials exist in this environment) by the
// time these tests reach it — there is no in-flight execution left to
// meaningfully cancel. That's still real, honest production behavior
// worth locking in: cancelling/retrying a session that isn't in the
// state either mutation requires is a defined, documented outcome
// (lib/pipeline/engine/pipelineEngine.ts's own isTerminalState/
// stage_failed guards), not an untested edge case.
describe("POST /api/analysis-sessions/:id/cancel", () => {
  it("cancelling an already-completed session is a no-op that returns it unchanged", async () => {
    const createResponse = await POST(buildCreateRequest({ startupIdea: "A meal-kit subscription box." }));
    const created = await createResponse.json();

    const { req, context } = buildMutateRequest(created.session.id);
    const response = await cancelPOST(req, context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session.id).toBe(created.session.id);
    expect(body.session.state).toBe("completed");
  });

  it("returns the app's documented not-found response for a nonexistent session id", async () => {
    const { req, context } = buildMutateRequest("session-does-not-exist");
    const response = await cancelPOST(req, context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No analysis session found for id "session-does-not-exist".');
  });

  it("rejects the request with 429 when the caller has exceeded the mutate rate limit", async () => {
    const createResponse = await POST(buildCreateRequest({ startupIdea: "A pet-sitting marketplace." }));
    const created = await createResponse.json();

    mockedCheckRateLimit.mockResolvedValue({ allowed: false, limit: 20, remaining: 0 });

    const { req, context } = buildMutateRequest(created.session.id);
    const response = await cancelPOST(req, context);

    expect(response.status).toBe(429);
  });
});

describe("POST /api/analysis-sessions/:id/retry", () => {
  it("rejects retrying a session that isn't in a failed state with 400", async () => {
    const createResponse = await POST(buildCreateRequest({ startupIdea: "A local tool-lending library app." }));
    const created = await createResponse.json();

    const { req, context } = buildMutateRequest(created.session.id);
    const response = await retryPOST(req, context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Cannot retry");
  });

  it("returns the app's documented not-found response for a nonexistent session id", async () => {
    const { req, context } = buildMutateRequest("session-does-not-exist");
    const response = await retryPOST(req, context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No analysis session found for id "session-does-not-exist".');
  });

  it("rejects the request with 429 when the caller has exceeded the mutate rate limit", async () => {
    const createResponse = await POST(buildCreateRequest({ startupIdea: "A neighborhood tool-share app." }));
    const created = await createResponse.json();

    mockedCheckRateLimit.mockResolvedValue({ allowed: false, limit: 20, remaining: 0 });

    const { req, context } = buildMutateRequest(created.session.id);
    const response = await retryPOST(req, context);

    expect(response.status).toBe(429);
  });
});
