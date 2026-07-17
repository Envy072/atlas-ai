// Typed error hierarchy for the service layer. Every error the app throws
// deliberately should extend AppError so API routes can map it to a
// consistent, correctly-coded response instead of guessing from a message.
export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);

    this.name = "AppError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "internal_error";

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// The AI (or whatever produced the payload) returned data that doesn't
// match the schema we require.
export class ValidationError extends AppError {
  constructor(message = "The response did not match the expected shape.") {
    super(message, { status: 502, code: "validation_error" });
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// A downstream dependency (OpenAI, Supabase, ...) failed.
export class ExternalServiceError extends AppError {
  readonly service: string;

  constructor(service: string, message?: string) {
    super(message ?? `${service} request failed.`, {
      status: 502,
      code: "external_service_error",
    });
    this.name = "ExternalServiceError";
    this.service = service;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Bad input from the caller (missing/invalid request body, etc.).
export class InvalidRequestError extends AppError {
  constructor(message = "Invalid request.") {
    super(message, { status: 400, code: "invalid_request" });
    this.name = "InvalidRequestError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// The caller is not signed in, and the route requires it (Milestone
// 39 — the first API route in this codebase to require authentication
// rather than merely reading identity when present). Deliberately
// distinct from InvalidRequestError: "you're not allowed to do this at
// all" and "you sent bad data" are different failure classes.
export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in to do this.") {
    super(message, { status: 401, code: "unauthorized" });
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
}

export function getErrorStatus(error: unknown): number {
  return error instanceof AppError ? error.status : 500;
}
