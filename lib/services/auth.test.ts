import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "@/tests/mocks/supabaseClient";

// Substitutes lib/supabase/server.ts's createClient — the real one
// calls next/headers' cookies(), which has no request-scoped context
// under plain Vitest execution and would throw if actually invoked
// (MILESTONE_30_DESIGN.md Security Review, "Test isolation").
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/services/auth";

const mockedCreateClient = vi.mocked(createClient);

describe("getCurrentUser", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it("returns null when Supabase has no signed-in user", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: null }));

    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the mapped AuthUser shape when a user is signed in", async () => {
    mockedCreateClient.mockResolvedValue(
      createMockSupabaseClient({ user: { id: "user-1", email: "founder@example.com" } as never })
    );

    expect(await getCurrentUser()).toEqual({ id: "user-1", email: "founder@example.com" });
  });

  it("defaults email to null when the Supabase user has no email", async () => {
    mockedCreateClient.mockResolvedValue(createMockSupabaseClient({ user: { id: "user-1" } as never }));

    expect(await getCurrentUser()).toEqual({ id: "user-1", email: null });
  });
});
