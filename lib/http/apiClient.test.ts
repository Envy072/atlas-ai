import { describe, it, expect, vi, afterEach } from "vitest";
import { postJSON, getJSON, ApiClientError } from "@/lib/http/apiClient";

// ApiClientError's first tests (Milestone 45) — the one place a
// non-OK response from our own API becomes a typed, inspectable error
// (status + AppError code) rather than a bare Error callers can only
// pattern-match on message text.

const mockFetch = vi.fn();

afterEach(() => {
  mockFetch.mockReset();
  vi.unstubAllGlobals();
});

function stubFetch(response: { ok: boolean; status: number; body: unknown }) {
  mockFetch.mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal("fetch", mockFetch);
}

describe("postJSON", () => {
  it("returns the parsed body on a successful response", async () => {
    stubFetch({ ok: true, status: 201, body: { id: "abc" } });

    const result = await postJSON("/api/thing", { name: "x" });

    expect(result).toEqual({ id: "abc" });
  });

  it("throws an ApiClientError carrying the real status and AppError code on a non-OK response", async () => {
    stubFetch({ ok: false, status: 403, body: { error: "Nope.", code: "usage_limit_exceeded" } });

    await expect(postJSON("/api/thing")).rejects.toMatchObject({
      message: "Nope.",
      status: 403,
      code: "usage_limit_exceeded",
    });
  });

  it("falls back to a generic message when the response body has no error field", async () => {
    stubFetch({ ok: false, status: 500, body: {} });

    await expect(postJSON("/api/thing")).rejects.toThrow("Request to /api/thing failed with status 500.");
  });

  it("leaves code undefined when the response body has none", async () => {
    stubFetch({ ok: false, status: 400, body: { error: "Bad." } });

    try {
      await postJSON("/api/thing");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).code).toBeUndefined();
    }
  });
});

describe("getJSON", () => {
  it("returns the parsed body on a successful response", async () => {
    stubFetch({ ok: true, status: 200, body: { value: 1 } });

    expect(await getJSON("/api/thing")).toEqual({ value: 1 });
  });

  it("throws an ApiClientError on a non-OK response, same as postJSON", async () => {
    stubFetch({ ok: false, status: 401, body: { error: "Sign in again.", code: "unauthorized" } });

    await expect(getJSON("/api/thing")).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });
});
