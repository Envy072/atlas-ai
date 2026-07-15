import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithRetry, RequestTimeoutError } from "@/lib/research/utils/httpRequest";

// fetchWithRetry's first-ever automated test (MILESTONE_32_DESIGN.md
// Deliverable 6). This is the one shared utility Brave, Tavily, and
// Crunchbase all depend on for retry, exponential backoff, timeout,
// and rate-limit (429) handling — tested here, directly and in
// isolation, with fake timers. A provider-level test that mocks fetch
// to resolve or reject exactly once (lib/research/providers/*.test.ts)
// never exercises this function's actual retry loop, its real backoff
// delay, or its real AbortController-driven timeout; it only proves a
// provider correctly labels an outcome it's handed. Retry/backoff
// mechanics are asserted here, once, rather than three times over
// (Principal Architect Review, MILESTONE_32_DESIGN.md Section 17,
// Finding 1).

function buildResponse(init: { ok: boolean; status: number }): Response {
  return { ...init, json: () => Promise.resolve({}) } as unknown as Response;
}

// A mocked fetch that genuinely respects the real AbortSignal
// fetchWithRetry passes it — this is what makes the timeout test below
// prove the real AbortController/setTimeout wiring fires, rather than
// asserting a canned rejection that was never actually triggered by a
// timeout.
function buildHangingFetch(): typeof fetch {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchWithRetry", () => {
  it("retries a 429 response and resolves with the successful response that follows", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildResponse({ ok: false, status: 429 }))
      .mockResolvedValueOnce(buildResponse({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchWithRetry(
      "https://example.com",
      {},
      { maxRetries: 2, baseBackoffMs: 300 }
    );

    await vi.advanceTimersByTimeAsync(300);

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries on a persistently retryable 500 and throws, after exactly maxRetries additional attempts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(buildResponse({ ok: false, status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchWithRetry(
      "https://example.com",
      {},
      { maxRetries: 2, baseBackoffMs: 300 }
    );
    const assertion = expect(resultPromise).rejects.toThrow("Received retryable HTTP status 500.");

    await vi.advanceTimersByTimeAsync(300);
    await vi.advanceTimersByTimeAsync(600);
    await assertion;

    // Initial attempt + 2 retries — never a fourth call once maxRetries is exhausted.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-retryable 404 — resolves immediately after a single attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(buildResponse({ ok: false, status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWithRetry(
      "https://example.com",
      {},
      { maxRetries: 2, baseBackoffMs: 300 }
    );

    expect(result.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doubles the backoff delay between consecutive retry attempts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildResponse({ ok: false, status: 500 }))
      .mockResolvedValueOnce(buildResponse({ ok: false, status: 500 }))
      .mockResolvedValueOnce(buildResponse({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchWithRetry(
      "https://example.com",
      {},
      { maxRetries: 2, baseBackoffMs: 300 }
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(299);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // first retry fires at 300ms (300 * 2^0)

    await vi.advanceTimersByTimeAsync(599);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3); // second retry fires 600ms later (300 * 2^1)

    const result = await resultPromise;
    expect(result.ok).toBe(true);
  });

  it("aborts a request that never resolves before timeoutMs, and rejects with RequestTimeoutError", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", buildHangingFetch());

    const resultPromise = fetchWithRetry("https://example.com", {}, { timeoutMs: 1000, maxRetries: 0 });
    const assertion = expect(resultPromise).rejects.toBeInstanceOf(RequestTimeoutError);

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});
