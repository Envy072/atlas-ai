import { NextResponse } from "next/server";
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
export function jsonError(error: unknown, fallbackMessage = "Something went wrong.") {
  const message = error instanceof AppError ? error.message : fallbackMessage;
  const status = getErrorStatus(error);
  const code = error instanceof AppError ? error.code : undefined;

  if (!(error instanceof AppError)) {
    console.error(error);
  }

  return NextResponse.json({ error: message, code }, { status });
}
