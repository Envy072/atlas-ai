// The only local helper this platform actually needs — unlike every
// prior platform, the Pipeline Context (Section 21) has no arrays of
// structured list items to dedupe (each stage occupies one fixed,
// named field, never a list), so this milestone needs no
// dedupeByKey/urlDedupeKey copy at all. One fewer instance of the
// utility duplication ARCHITECTURE_REVIEW.md/Section 22 flagged as debt
// — not a fix for that debt, just a case where this domain doesn't
// happen to need the duplicated shape.
let executionIdCounter = 0;

export function nextExecutionId(): string {
  executionIdCounter += 1;
  return `pipeline_${Date.now()}_${executionIdCounter}`;
}
