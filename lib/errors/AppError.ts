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

// A Stripe webhook request's signature didn't verify — the entire
// security model for app/api/webhooks/stripe/route.ts
// (MILESTONE_44_DESIGN.md Security Considerations). Rejected before any
// database write is attempted.
export class WebhookVerificationError extends AppError {
  constructor(message = "Webhook signature verification failed.") {
    super(message, { status: 400, code: "webhook_verification_failed" });
    this.name = "WebhookVerificationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// A signed-in Free-tier user has reached their monthly analysis cap
// (MILESTONE_44_DESIGN.md Scope — enforced free-tier limits). Never
// thrown for an anonymous caller: Milestone 27's approved "anonymous
// users may run an analysis" decision is unmetered and unchanged.
export class UsageLimitExceededError extends AppError {
  constructor(message = "You've reached your Free tier's monthly analysis limit.") {
    super(message, { status: 403, code: "usage_limit_exceeded" });
    this.name = "UsageLimitExceededError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// A caller exceeded a configured rate limit (Milestone 47 —
// lib/services/rateLimit/). Deliberately its own class rather than
// reusing InvalidRequestError: "you sent something malformed" and "you
// sent too many well-formed requests" are different failure classes,
// and describeError() (lib/errors/messages.ts) already has a specific
// 429 fallback message ready for this status.
export class RateLimitExceededError extends AppError {
  constructor(message = "You're sending requests too quickly. Please wait and try again.") {
    super(message, { status: 429, code: "rate_limit_exceeded" });
    this.name = "RateLimitExceededError";
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
