import { describe, it, expect } from "vitest";
import { nextExecutionId } from "@/lib/pipeline/utils/id";

// Milestone 83 — verifies this file's actual, current behavior: the id
// format (pipeline_<timestamp>_<counter>) and that consecutive calls
// produce distinct ids via the module-level counter.
describe("nextExecutionId", () => {
  it("returns an id matching the documented format", () => {
    expect(nextExecutionId()).toMatch(/^pipeline_\d+_\d+$/);
  });

  it("returns a distinct id on every call", () => {
    const a = nextExecutionId();
    const b = nextExecutionId();

    expect(a).not.toBe(b);
  });

  it("increments the counter component across consecutive calls", () => {
    const first = nextExecutionId();
    const second = nextExecutionId();

    const firstCounter = Number(first.split("_").at(-1));
    const secondCounter = Number(second.split("_").at(-1));

    expect(secondCounter).toBe(firstCounter + 1);
  });
});
