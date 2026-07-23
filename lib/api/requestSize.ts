import { InvalidRequestError } from "@/lib/errors";

// A generous ceiling for this app's own JSON request bodies (Milestone
// 102) — every real body today is a short idea/description string, well
// under 2KB even at each field's own schema-level max. 10KB leaves ample
// headroom for encoding overhead while still rejecting a wildly oversized
// payload before it's ever parsed. Best-effort, not a hard guarantee: a
// bad-faith caller can omit or lie about Content-Length, so this is
// defense-in-depth alongside each schema's own .max() bounds (the real
// backstop, since those run after parsing regardless), not a replacement
// for them.
const MAX_JSON_BODY_BYTES = 10_000;

// The one place a route checks its own request size before parsing the
// body (mirrors lib/api/clientIdentity.ts's own "one shared helper, not
// per-route logic" shape). Every route that accepts a JSON body calls
// this before req.json().
export function assertRequestNotTooLarge(req: Request, maxBytes: number = MAX_JSON_BODY_BYTES): void {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new InvalidRequestError("Request body is too large.");
  }
}
