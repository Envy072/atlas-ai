import { ApiClientError } from "@/lib/http/apiClient";

// The one place a thrown error becomes user-facing copy (Milestone 45,
// Part 8) — reused everywhere a client component currently shows a raw
// error message. Every case explains what happened, why, and what to
// do next, rather than a bare message string. Keyed on ApiClientError's
// own `status`/`code` (lib/http/apiClient.ts), which in turn come
// straight from the AppError subclass a route actually threw
// (lib/api/response.ts's jsonError) — no string-matching on message
// text anywhere.
export interface UserFacingError {
  title: string;
  description: string;
}

const GENERIC: UserFacingError = {
  title: "Something went wrong",
  description: "An unexpected error occurred. Please try again.",
};

// A bare (non-ApiClientError) failure means fetch() itself rejected —
// no HTTP response was ever received at all (a dropped connection, a
// platform timeout, being offline). This is genuinely different from a
// real error response from our own API: the server may well have kept
// working after the connection dropped.
const CONNECTION_LOST: UserFacingError = {
  title: "Connection issue",
  description: "We couldn't reach the server. If something was already running, it may still complete — check back in a moment.",
};

export function describeError(error: unknown): UserFacingError {
  if (!(error instanceof ApiClientError)) {
    return CONNECTION_LOST;
  }

  switch (error.code) {
    case "unauthorized":
      return {
        title: "Sign-in required",
        description: "Your session has expired. Sign in again to continue.",
      };
    case "usage_limit_exceeded":
      return {
        title: "Subscription required",
        description: `${error.message} Upgrade to the Founder tier for unlimited analyses.`,
      };
    case "invalid_request":
      return {
        title: "Check your input",
        description: error.message,
      };
  }

  if (error.status === 429) {
    return {
      title: "Rate limit reached",
      description: "You're sending requests too quickly. Wait a moment and try again.",
    };
  }

  if (error.status >= 500) {
    return {
      title: "Service temporarily unavailable",
      description: "Something went wrong on our end. Please try again in a moment.",
    };
  }

  return { title: GENERIC.title, description: error.message || GENERIC.description };
}
