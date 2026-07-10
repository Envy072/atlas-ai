// Thin fetch wrapper for client-side calls to our own API routes. Centralizes
// header/serialization boilerplate and turns a non-OK response into a thrown
// Error with the server's own message when available.
export async function postJSON<TResponse = unknown>(
  url: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request to ${url} failed with status ${res.status}.`;

    throw new Error(message);
  }

  return data as TResponse;
}
