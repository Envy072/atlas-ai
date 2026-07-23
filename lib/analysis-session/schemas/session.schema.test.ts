import { describe, it, expect } from "vitest";
import { CreateSessionInputSchema } from "@/lib/analysis-session/schemas/session.schema";

// The first test for CreateSessionInputSchema's own bounds (Milestone
// 102) — startupIdea feeds directly into the real generation pipeline,
// so its length ceiling is the one genuinely security-relevant boundary
// this schema owns.
describe("CreateSessionInputSchema", () => {
  it("accepts a well-formed idea with no title", () => {
    const result = CreateSessionInputSchema.safeParse({ startupIdea: "A subscription box for coffee." });
    expect(result.success).toBe(true);
  });

  it("rejects an empty startupIdea", () => {
    const result = CreateSessionInputSchema.safeParse({ startupIdea: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a startupIdea at exactly the 2000-character ceiling", () => {
    const result = CreateSessionInputSchema.safeParse({ startupIdea: "a".repeat(2000) });
    expect(result.success).toBe(true);
  });

  it("rejects a startupIdea longer than 2000 characters", () => {
    const result = CreateSessionInputSchema.safeParse({ startupIdea: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts a title at exactly the 200-character ceiling", () => {
    const result = CreateSessionInputSchema.safeParse({
      startupIdea: "A subscription box for coffee.",
      title: "a".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a title longer than 200 characters", () => {
    const result = CreateSessionInputSchema.safeParse({
      startupIdea: "A subscription box for coffee.",
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});
