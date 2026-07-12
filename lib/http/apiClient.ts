function extractErrorMessage(url: string, status: number, data: unknown): string {
  return typeof data === "object" && data !== null && "error" in data
    ? String((data as { error: unknown }).error)
    : `Request to ${url} failed with status ${status}.`;
}

// Thin fetch wrapper for client-side calls to our own API routes. Centralizes
// header/serialization boilerplate and turns a non-OK response into a thrown
// Error with the server's own message when available.
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
    throw new Error(extractErrorMessage(url, res.status, data));
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
    throw new Error(extractErrorMessage(url, res.status, data));
  }

  return data as TResponse;
}
