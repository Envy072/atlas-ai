// Confirms the design's own open question (MILESTONE_12_DESIGN.md's
// Risks: "isn't known until timeline/logs are actually built"): this
// layer, like lib/pipeline before it, needs no dedupeByKey/urlDedupeKey-
// style helper — Timeline entries and Log entries are both flat lists
// built directly from stageHistory with no cross-list deduplication
// required. Two small id generators are all this module needs.

let sessionIdCounter = 0;

export function nextSessionId(): string {
  sessionIdCounter += 1;
  return `session_${Date.now()}_${sessionIdCounter}`;
}

let timelineEntryIdCounter = 0;

export function nextTimelineEntryId(): string {
  timelineEntryIdCounter += 1;
  return `timeline_${Date.now()}_${timelineEntryIdCounter}`;
}
