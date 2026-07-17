import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  ExternalServiceError,
  InvalidRequestError,
  UnauthorizedError,
  getErrorMessage,
  getErrorStatus,
} from "@/lib/errors";

describe("AppError", () => {
  it("defaults to status 500 and code 'internal_error'", () => {
    const error = new AppError("Something broke.");
    expect(error.status).toBe(500);
    expect(error.code).toBe("internal_error");
    expect(error.message).toBe("Something broke.");
    expect(error).toBeInstanceOf(Error);
  });

  it("accepts an explicit status/code", () => {
    const error = new AppError("Custom.", { status: 418, code: "teapot" });
    expect(error.status).toBe(418);
    expect(error.code).toBe("teapot");
  });
});

describe("ValidationError", () => {
  it("defaults to status 502 and code 'validation_error'", () => {
    const error = new ValidationError();
    expect(error.status).toBe(502);
    expect(error.code).toBe("validation_error");
    expect(error).toBeInstanceOf(AppError);
  });

  it("accepts a custom message", () => {
    expect(new ValidationError("Bad shape.").message).toBe("Bad shape.");
  });
});

describe("ExternalServiceError", () => {
  it("defaults to status 502 and code 'external_service_error', naming the service", () => {
    const error = new ExternalServiceError("OpenAI");
    expect(error.status).toBe(502);
    expect(error.code).toBe("external_service_error");
    expect(error.service).toBe("OpenAI");
    expect(error.message).toBe("OpenAI request failed.");
  });

  it("accepts a custom message alongside the service name", () => {
    const error = new ExternalServiceError("Supabase", "Connection refused.");
    expect(error.message).toBe("Connection refused.");
    expect(error.service).toBe("Supabase");
  });
});

describe("InvalidRequestError", () => {
  it("defaults to status 400 and code 'invalid_request'", () => {
    const error = new InvalidRequestError();
    expect(error.status).toBe(400);
    expect(error.code).toBe("invalid_request");
  });
});

describe("UnauthorizedError", () => {
  it("defaults to status 401 and code 'unauthorized'", () => {
    const error = new UnauthorizedError();
    expect(error.status).toBe(401);
    expect(error.code).toBe("unauthorized");
    expect(error).toBeInstanceOf(AppError);
  });

  it("accepts a custom message", () => {
    expect(new UnauthorizedError("Nope.").message).toBe("Nope.");
  });
});

describe("getErrorMessage", () => {
  it("returns an Error's own message", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a string error as-is", () => {
    expect(getErrorMessage("plain string error")).toBe("plain string error");
  });

  it("falls back to a generic message for anything else", () => {
    expect(getErrorMessage({ weird: true })).toBe("Something went wrong.");
    expect(getErrorMessage(null)).toBe("Something went wrong.");
    expect(getErrorMessage(undefined)).toBe("Something went wrong.");
  });
});

describe("getErrorStatus", () => {
  it("returns an AppError's own status", () => {
    expect(getErrorStatus(new InvalidRequestError())).toBe(400);
  });

  it("defaults to 500 for a non-AppError", () => {
    expect(getErrorStatus(new Error("boom"))).toBe(500);
    expect(getErrorStatus("plain string")).toBe(500);
  });
});
