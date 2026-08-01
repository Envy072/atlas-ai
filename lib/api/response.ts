import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AppError, getErrorStatus } from "@/lib/errors";
import { trackServerEvent } from "@/lib/analytics/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// Maps a thrown error to a client-safe JSON response. AppError (and its
// subclasses) messages are safe to expose as-is; anything unexpected is
// logged in full server-side and replaced with a generic message.
//
// `code` is additive (Milestone 45) — every existing caller reading
// only `body.error` is unaffected; it lets the client (lib/http/apiClient.ts,
// lib/errors/messages.ts) distinguish *which* AppError subclass occurred
// instead of pattern-matching on message text, without exposing anything
// new for an unexpected (non-AppError) failure.
//
// Milestone 121 — also reports the same unexpected error to Sentry
// (instrumentation.ts's own capture, DSN-optional/no-op without one
// configured). This is the one, deliberate manual capture point for
// every API route in this codebase: every route already catches its
// own errors and returns a JSON response rather than rethrowing, so
// the throw never escapes far enough for Next.js's own onRequestError
// hook to see it — this call is what gives route handlers coverage,
// not a duplicate of anything onRequestError would otherwise catch.
//
// Milestone 123 — also reports the same unexpected error as a product
// event (UNEXPECTED_SERVER_ERROR), alongside Sentry's debuggable stack
// trace — a different audience (product/ops visibility into how often
// founders hit a broken state), not a duplicate of it. `error.code`
// only (an AppError-shaped status code at most, never present on a raw
// Error) — deliberately never `error.message`, which could echo back
// interpolated user input in a way this milestone's own "no user text"
// rule rules out. Awaited (making this function itself async, which
// every real call site already satisfies — every one of them is a bare
// `return jsonError(error)` inside an already-async route handler)
// rather than fired-and-forgotten: this app's hosting platform is
// unconfirmed, and an un-awaited send could be dropped if a serverless
// invocation freezes right after the response goes out.
export async function jsonError(error: unknown, fallbackMessage = "Something went wrong.") {
  const message = error instanceof AppError ? error.message : fallbackMessage;
  const status = getErrorStatus(error);
  const code = error instanceof AppError ? error.code : undefined;

  if (!(error instanceof AppError)) {
    console.error(error);
    Sentry.captureException(error);
    await trackServerEvent(ANALYTICS_EVENTS.UNEXPECTED_SERVER_ERROR, "server", {
      status,
    });
  }

  return NextResponse.json({ error: message, code }, { status });
}
