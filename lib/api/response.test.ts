import { describe, it, expect, vi } from "vitest";
import { jsonSuccess, jsonError } from "@/lib/api/response";
import { InvalidRequestError } from "@/lib/errors";

describe("jsonSuccess", () => {
  it("returns a 200 response with the given data by default", async () => {
    const response = jsonSuccess({ hello: "world" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hello: "world" });
  });

  it("accepts a custom status", async () => {
    const response = jsonSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });
});

describe("jsonError", () => {
  it("exposes an AppError's own message and status as-is", async () => {
    const response = jsonError(new InvalidRequestError("Bad input."));
    expect(response.status).toBe(400);
    // `code` is Milestone 45's own additive field — lets the client
    // (lib/http/apiClient.ts's ApiClientError) distinguish which
    // AppError subclass occurred without pattern-matching on message
    // text. The two fallback tests below don't need updating: a
    // non-AppError has no `code` at all, and JSON.stringify drops an
    // `undefined` value entirely rather than serializing it.
    expect(await response.json()).toEqual({ error: "Bad input.", code: "invalid_request" });
  });

  it("replaces an unexpected error's message with the fallback, and logs the real one", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = jsonError(new Error("some internal detail"), "Public fallback message.");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Public fallback message." });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });

  it("uses jsonError's own default fallback message when none is provided", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = jsonError(new Error("detail"));

    expect(await response.json()).toEqual({ error: "Something went wrong." });

    consoleErrorSpy.mockRestore();
  });

  it("never logs an AppError (it's an expected, already-safe failure)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    jsonError(new InvalidRequestError("Bad input."));

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
