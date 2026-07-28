import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AppError, getErrorStatus } from "@/lib/errors";

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
export function jsonError(error: unknown, fallbackMessage = "Something went wrong.") {
  const message = error instanceof AppError ? error.message : fallbackMessage;
  const status = getErrorStatus(error);
  const code = error instanceof AppError ? error.code : undefined;

  if (!(error instanceof AppError)) {
    console.error(error);
    Sentry.captureException(error);
  }

  return NextResponse.json({ error: message, code }, { status });
}
