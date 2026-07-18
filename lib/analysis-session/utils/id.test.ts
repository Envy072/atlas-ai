import { describe, it, expect } from "vitest";
import { nextSessionId } from "@/lib/analysis-session/utils/id";

// Milestone 47 — the Milestone 46 review's own finding: the prior
// `session_${Date.now()}_${counter}` shape was sequential and
// guessable, since this id is the sole access boundary for an
// anonymous caller's own session.
describe("nextSessionId", () => {
  it("returns a session_-prefixed id whose suffix is a real v4 UUID", () => {
    const id = nextSessionId();

    expect(id).toMatch(/^session_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("generates a unique id on every call — no shared sequential counter", () => {
    const ids = new Set(Array.from({ length: 50 }, () => nextSessionId()));

    expect(ids.size).toBe(50);
  });
});
