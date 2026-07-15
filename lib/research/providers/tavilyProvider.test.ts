import { describe, it, expect, vi, afterEach } from "vitest";
import { tavilyProvider } from "@/lib/research/providers/tavilyProvider";
import { mockFetchOnce, mockFetchTimeout, restoreFetch } from "@/tests/mocks/fetchMock";

// tavilyProvider's first-ever automated test (MILESTONE_32_DESIGN.md
// Deliverable 8). Same category shape as braveProvider.test.ts
// (Deliverable 7), adapted to Tavily's own response shape and its real
// score-to-confidence mapping. Retry/backoff mechanics themselves are
// lib/research/utils/httpRequest.test.ts's job (Deliverable 6), not
// re-tested here.

afterEach(() => {
  restoreFetch();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("tavilyProvider.search", () => {
  it("returns not_configured when TAVILY_API_KEY is unset, without calling fetch", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("not_configured");
    expect(result.sources).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("normalizes a successful response into Source[], mapping Tavily's real relevance score to confidence", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          results: [
            {
              title: "A real result",
              url: "https://example.com/a",
              content: "A snippet",
              published_date: "2026-01-01",
              score: 0.8,
            },
          ],
        }),
    });

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({ url: "https://example.com/a", confidence: 80 });
  });

  it("falls back to a neutral confidence of 50 when Tavily omits the score field", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          results: [{ title: "No score here", url: "https://example.com/no-score", content: "..." }],
        }),
    });

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.sources[0]?.confidence).toBe(50);
  });

  it("returns ok with an empty sources array for a genuinely empty, valid response", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) });

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toEqual([]);
  });

  it("skips an individually malformed result without failing the whole call", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          results: [
            { title: "Missing a URL", content: "..." },
            { title: "Valid result", url: "https://example.com/valid", content: "...", score: 0.6 },
          ],
        }),
    });

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("ok");
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]?.url).toBe("https://example.com/valid");
  });

  it("returns error when the response body is not valid JSON", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.reject(new Error("Unexpected token")) });

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("error");
    expect(result.sources).toEqual([]);
  });

  it("returns error for a non-OK, non-retryable HTTP status", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    mockFetchOnce({ ok: false, status: 401, json: () => Promise.resolve({}) });

    const result = await tavilyProvider.search({ topic: "startup idea" });

    expect(result.status).toBe("error");
    expect(result.error).toContain("401");
  });

  it("returns timeout when every attempt aborts", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-key");
    vi.useFakeTimers();
    mockFetchTimeout();

    const resultPromise = tavilyProvider.search({ topic: "startup idea" });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe("timeout");
  });
});
