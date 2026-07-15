import { describe, it, expect, vi, afterEach } from "vitest";
import { braveProvider } from "@/lib/research/providers/braveProvider";
import { mockFetchOnce, mockFetchTimeout, restoreFetch } from "@/tests/mocks/fetchMock";

// braveProvider's first-ever automated test (MILESTONE_32_DESIGN.md
// Deliverable 7). Tests only Brave's own classification and
// normalization of an outcome it's handed — retry/backoff mechanics
// themselves are lib/research/utils/httpRequest.test.ts's job
// (Deliverable 6), not re-tested here.

afterEach(() => {
  restoreFetch();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("braveProvider.search", () => {
  it("returns not_configured when BRAVE_API_KEY is unset, without calling fetch", async () => {
    vi.stubEnv("BRAVE_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await braveProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("not_configured");
    expect(result.sources).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes a successful response into Source[], with decaying position-based confidence", async () => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          web: {
            results: [
              { title: "First result", url: "https://example.com/a", description: "A snippet" },
              { title: "Second result", url: "https://example.com/b", description: "Another snippet" },
            ],
          },
        }),
    });

    const result = await braveProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({ url: "https://example.com/a", confidence: 90 });
    expect(result.sources[1]).toMatchObject({ url: "https://example.com/b", confidence: 80 });
  });

  it("returns ok with an empty sources array for a genuinely empty, valid response", async () => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.resolve({ web: { results: [] } }) });

    const result = await braveProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toEqual([]);
  });

  it("skips an individually malformed result without failing the whole call", async () => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          web: {
            results: [
              { title: "Missing a URL" },
              { title: "Valid result", url: "https://example.com/valid", description: "ok" },
            ],
          },
        }),
    });

    const result = await braveProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.url).toBe("https://example.com/valid");
  });

  it("returns error when the response body is not valid JSON", async () => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.reject(new Error("Unexpected token")) });

    const result = await braveProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("error");
    expect(result.sources).toEqual([]);
  });

  it("returns error for a non-OK, non-retryable HTTP status", async () => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
    mockFetchOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

    const result = await braveProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("error");
    expect(result.error).toContain("401");
  });

  it("returns timeout when every attempt aborts", async () => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
    vi.useFakeTimers();
    mockFetchTimeout();

    const resultPromise = braveProvider.search({ topic: "startup idea" });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe("timeout");
  });
});
