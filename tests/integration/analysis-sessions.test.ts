import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";

// getCurrentUser() (called by both routes below, since this route
// family stays public for anonymous callers) reads next/headers'
// cookies(), which has no request-scoped context under plain Vitest
// execution and throws if actually invoked — confirmed directly by
// running an unmocked probe before writing this file. Mocked here to
// simulate the ordinary anonymous caller this route already supports;
// the actual subject under test — the real, unmodified route handlers,
// the real lib/analysis-session lifecycle, and the real (already
// in-memory by default) session store — is untouched
// (MILESTONE_30_DESIGN.md Architecture, "No mock needed for
// lib/analysis-session's store").
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

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

import { createClient } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/services/stripe";
import { countProjectsThisMonth } from "@/lib/services/projects";
import { POST } from "@/app/api/analysis-sessions/route";
import { GET } from "@/app/api/analysis-sessions/[id]/route";
import type { User } from "@supabase/supabase-js";

const mockedCreateClient = vi.mocked(createClient);
const mockedGetUserTier = vi.mocked(getUserTier);
const mockedCountProjectsThisMonth = vi.mocked(countProjectsThisMonth);

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
