import { vi } from "vitest";

export interface MockFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

// A small, generic wrapper around Vitest's own vi.stubGlobal/
// vi.unstubAllGlobals for the one external dependency the research
// providers share: the platform's global fetch. Deliberately thin —
// it mocks a single, stable, versioned platform API, not a
// provider-specific SDK, so there is no provider-specific surface to
// drift (MILESTONE_32_DESIGN.md Section 12). Promoted to a shared
// helper at its third use across the Brave/Tavily/Crunchbase provider
// test files (CLAUDE.md Section 11's "three repetitions" rule, applied
// identically here to test infrastructure).
//
// lib/research/utils/httpRequest.test.ts deliberately does not use
// this helper — it needs sequential, multi-call mock behavior a
// single-response helper isn't shaped for, and stubs fetch directly
// instead (MILESTONE_32_DESIGN.md Section 7).

export function mockFetchOnce(response: MockFetchResponse): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response as Response));
}

// Simulates every attempt of fetchWithRetry's own internal retry loop
// aborting — a persistent rejection, not a single one, since a
// provider-level test's only goal is confirming the provider correctly
// classifies the *final* outcome as "timeout"; re-verifying
// fetchWithRetry's own retry count/backoff timing is
// lib/research/utils/httpRequest.test.ts's job, not this helper's.
export function mockFetchTimeout(): void {
  const abortError = new DOMException("The operation was aborted.", "AbortError");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));
}

export function restoreFetch(): void {
  vi.unstubAllGlobals();
}
