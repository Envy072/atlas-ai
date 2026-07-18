import { describe, it, expect } from "vitest";
import { describeError } from "@/lib/errors/messages";
import { ApiClientError } from "@/lib/http/apiClient";

// describeError()'s first tests (Milestone 45, Part 8) — every branch
// this function actually has, keyed on ApiClientError's status/code.

describe("describeError", () => {
  it("returns a connection-issue message for a bare (non-ApiClientError) failure", () => {
    const result = describeError(new TypeError("Failed to fetch"));

    expect(result.title).toBe("Connection issue");
    expect(result.description).toContain("may still complete");
  });

  it("maps 'unauthorized' to a sign-in-required message", () => {
    const result = describeError(new ApiClientError("Nope.", 401, "unauthorized"));

    expect(result.title).toBe("Sign-in required");
  });

  it("maps 'usage_limit_exceeded' to a subscription-required message, including the real error text", () => {
    const result = describeError(
      new ApiClientError("You've reached your Free tier's monthly analysis limit.", 403, "usage_limit_exceeded")
    );

    expect(result.title).toBe("Subscription required");
    expect(result.description).toContain("You've reached your Free tier's monthly analysis limit.");
    expect(result.description).toContain("Upgrade to the Founder tier");
  });

  it("maps 'invalid_request' to the raw message, unmodified", () => {
    const result = describeError(new ApiClientError("A valid startupIdea is required.", 400, "invalid_request"));

    expect(result.description).toBe("A valid startupIdea is required.");
  });

  it("maps status 429 (no matching code) to a rate-limit message", () => {
    const result = describeError(new ApiClientError("Too many requests.", 429));

    expect(result.title).toBe("Rate limit reached");
  });

  it("maps a 5xx status (no matching code) to a service-unavailable message", () => {
    const result = describeError(new ApiClientError("Boom.", 502));

    expect(result.title).toBe("Service temporarily unavailable");
  });

  it("falls back to the raw message for an unrecognized 4xx status", () => {
    const result = describeError(new ApiClientError("Something specific.", 409));

    expect(result.description).toBe("Something specific.");
  });
});
