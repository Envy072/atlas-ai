import type { SessionRecord } from "@/lib/analysis-session/schemas/session.schema";
import { nextSessionId } from "@/lib/analysis-session/utils/id";

export interface BuildSessionRecordInput {
  executionId: string;
  title: string;
  startupIdea: string;
  ownerId: string | null;
}

// The one place a brand-new SessionRecord gets constructed — the tiny
// metadata shape this layer actually persists (MILESTONE_12_DESIGN.md
// Section 10).
export function buildSessionRecord(
  input: BuildSessionRecordInput,
  now: Date = new Date()
): SessionRecord {
  return {
    id: nextSessionId(),
    executionId: input.executionId,
    title: input.title,
    startupIdea: input.startupIdea,
    ownerId: input.ownerId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
