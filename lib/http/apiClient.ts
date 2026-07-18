// Thrown for any non-OK response from our own API (Milestone 45) —
// carries the real HTTP status and, when the route used jsonError(),
// the AppError subclass's own `code` (e.g. "usage_limit_exceeded",
// "unauthorized"). A plain `fetch` rejection (a genuine network-layer
// failure — no response was ever received at all, e.g. a dropped
// connection or a platform timeout) throws a bare TypeError instead,
// never this class — that distinction is exactly what
// lib/errors/messages.ts uses to tell "the server told us no" apart
// from "we don't actually know what happened server-side."
export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function extractErrorMessage(url: string, status: number, data: unknown): string {
  return typeof data === "object" && data !== null && "error" in data
    ? String((data as { error: unknown }).error)
    : `Request to ${url} failed with status ${status}.`;
}

function extractErrorCode(data: unknown): string | undefined {
  return typeof data === "object" && data !== null && "code" in data
    ? String((data as { code: unknown }).code)
    : undefined;
}

// Thin fetch wrapper for client-side calls to our own API routes. Centralizes
// header/serialization boilerplate and turns a non-OK response into a thrown
// ApiClientError with the server's own message and code when available.
export async function postJSON<TResponse = unknown>(
  url: string,
  body?: unknown
): Promise<TResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiClientError(extractErrorMessage(url, res.status, data), res.status, extractErrorCode(data));
  }

  return data as TResponse;
}

// GET counterpart to postJSON, added for the session-polling flow
// (MILESTONE_14_DESIGN.md Section 7.2) — same error-handling contract,
// no request body.
export async function getJSON<TResponse = unknown>(url: string): Promise<TResponse> {
  const res = await fetch(url);

  const data = await res.json();

  if (!res.ok) {
    throw new ApiClientError(extractErrorMessage(url, res.status, data), res.status, extractErrorCode(data));
  }

  return data as TResponse;
}
