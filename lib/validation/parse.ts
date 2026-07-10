import type { ZodType } from "zod";
import { ValidationError } from "@/lib/errors";

// Single place that turns "does this data match the schema?" into either
// the typed value or a typed ValidationError, instead of every caller
// hand-rolling its own safeParse + throw.
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown, message?: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(message);
  }

  return result.data;
}
