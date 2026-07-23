import { describe, it, expect } from "vitest";
import { assertRequestNotTooLarge } from "@/lib/api/requestSize";

function buildRequest(contentLength: string | null): Request {
  const headers = new Headers();
  if (contentLength !== null) {
    headers.set("content-length", contentLength);
  }
  return new Request("http://localhost/api/test", { method: "POST", headers });
}

describe("assertRequestNotTooLarge", () => {
  it("does not throw when Content-Length is under the default ceiling", () => {
    expect(() => assertRequestNotTooLarge(buildRequest("500"))).not.toThrow();
  });

  it("does not throw when Content-Length is missing", () => {
    expect(() => assertRequestNotTooLarge(buildRequest(null))).not.toThrow();
  });

  it("throws when Content-Length exceeds the default ceiling", () => {
    expect(() => assertRequestNotTooLarge(buildRequest("10001"))).toThrow("Request body is too large.");
  });

  it("respects a caller-supplied ceiling", () => {
    expect(() => assertRequestNotTooLarge(buildRequest("200"), 100)).toThrow("Request body is too large.");
    expect(() => assertRequestNotTooLarge(buildRequest("100"), 100)).not.toThrow();
  });
});
