import { describe, it, expect, vi, afterEach } from "vitest";
import { crunchbaseProvider } from "@/lib/research/providers/crunchbaseProvider";
import { mockFetchOnce, mockFetchTimeout, restoreFetch } from "@/tests/mocks/fetchMock";

// crunchbaseProvider's first-ever automated test (MILESTONE_32_DESIGN.md
// Deliverable 9), written alongside its real implementation (Deliverable
// 2, Sub-milestone 32.2). Same category shape as braveProvider.test.ts/
// tavilyProvider.test.ts (Deliverables 7-8), adapted to Crunchbase's own
// entities/properties response shape and its business_database source
// type. Retry/backoff mechanics themselves are
// lib/research/utils/httpRequest.test.ts's job (Deliverable 6), not
// re-tested here.

afterEach(() => {
  restoreFetch();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("crunchbaseProvider.search", () => {
  it("returns not_configured when CRUNCHBASE_API_KEY is unset, without calling fetch", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await crunchbaseProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("not_configured");
    expect(result.sources).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes a successful response into Source[], pointing at the organization's real Crunchbase page", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          entities: [
            {
              properties: {
                identifier: { permalink: "example-org" },
                name: "Example Org",
                short_description: "A real company description",
                founded_on: { value: "2020-01-01" },
              },
            },
          ],
        }),
    });

    const result = await crunchbaseProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({
      url: "https://www.crunchbase.com/organization/example-org",
      domain: "crunchbase.com",
      title: "Example Org",
      confidence: 90,
    });
  });

  it("returns ok with an empty sources array for a genuinely empty, valid response", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "test-key");
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.resolve({ entities: [] }) });

    const result = await crunchbaseProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toEqual([]);
  });

  it("skips an individually malformed result (no resolvable permalink) without failing the whole call", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          entities: [
            { properties: { name: "Missing a permalink" } },
            {
              properties: {
                identifier: { permalink: "valid-org" },
                name: "Valid Org",
                short_description: "ok",
              },
            },
          ],
        }),
    });

    const result = await crunchbaseProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.url).toBe("https://www.crunchbase.com/organization/valid-org");
  });

  it("returns error when the response body is not valid JSON", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "test-key");
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.reject(new Error("Unexpected token")) });

    const result = await crunchbaseProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("error");
    expect(result.sources).toEqual([]);
  });

  it("returns error for a non-OK, non-retryable HTTP status", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "test-key");
    mockFetchOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

    const result = await crunchbaseProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("error");
    expect(result.error).toContain("401");
  });

  it("returns timeout when every attempt aborts", async () => {
    vi.stubEnv("CRUNCHBASE_API_KEY", "test-key");
    vi.useFakeTimers();
    mockFetchTimeout();

    const resultPromise = crunchbaseProvider.search({ topic: "startup idea" });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe("timeout");
  });
});
