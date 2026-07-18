// Confirms the design's own open question (MILESTONE_12_DESIGN.md's
// Risks: "isn't known until timeline/logs are actually built"): this
// layer, like lib/pipeline before it, needs no dedupeByKey/urlDedupeKey-
// style helper — Timeline entries and Log entries are both flat lists
// built directly from stageHistory with no cross-list deduplication
// required. Two small id generators are all this module needs.

import { randomUUID } from "node:crypto";

// Cryptographically random, not sequential (Milestone 47 — the
// Milestone 46 review's own finding: the prior `session_${Date.now()}_
// ${counter}` shape was guessable/enumerable, and this id is the sole
// access boundary for an anonymous caller's own session). The
// `session_` prefix is kept purely for log readability — every bit of
// this id's actual entropy comes from randomUUID(), so the prefix adds
// no predictability.
export function nextSessionId(): string {
  return `session_${randomUUID()}`;
}

let timelineEntryIdCounter = 0;

export function nextTimelineEntryId(): string {
  timelineEntryIdCounter += 1;
  return `timeline_${Date.now()}_${timelineEntryIdCounter}`;
}
