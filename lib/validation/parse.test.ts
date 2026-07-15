import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseOrThrow } from "@/lib/validation/parse";
import { ValidationError } from "@/lib/errors";

const schema = z.object({ name: z.string() });

describe("parseOrThrow", () => {
  it("returns the parsed value when the data matches the schema", () => {
    expect(parseOrThrow(schema, { name: "Atlas" })).toEqual({ name: "Atlas" });
  });

  it("throws a ValidationError when the data does not match the schema", () => {
    expect(() => parseOrThrow(schema, { name: 123 })).toThrow(ValidationError);
  });

  it("uses the provided message on the thrown ValidationError", () => {
    expect.assertions(2);
    try {
      parseOrThrow(schema, {}, "Custom failure message.");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toBe("Custom failure message.");
    }
  });

  it("falls back to ValidationError's own default message when none is provided", () => {
    expect.assertions(1);
    try {
      parseOrThrow(schema, {});
    } catch (error) {
      expect((error as ValidationError).message).toBe("The response did not match the expected shape.");
    }
  });
});
