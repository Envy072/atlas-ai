# Atlas AI — Verification

Documentation for `lib/verification/` (Milestone 13), built exactly as
specified in `MILESTONE_13_DESIGN.md`. This layer makes an already-complete
`DecisionProfile`'s sourcing, evidence, and confidence directly readable —
it computes nothing new about the business itself.

---

## Why This Exists

The first real product evaluation of Atlas AI scored it 5/10 and named a
specific, Priority 1 gap in `PRODUCT_BACKLOG.md`: **Trust & Evidence**.
Sources weren't visible, facts weren't clearly referenced, confidence was
hard to trust, conclusions weren't explained, and it was unclear what was
verified versus inferred. Every fact this complaint is about already
existed in `lib/decision`'s `DecisionProfile` — it just had nowhere to be
read from as one coherent view. This module is that view.

## Architecture

```
lib/verification/
  index.ts                              — public barrel
  buildVerificationSummary.ts            — primary function (depends only on lib/decision)
  buildVerificationSummaryFromSession.ts — convenience wrapper (depends on lib/analysis-session too)
  schemas/
    verification.schema.ts               — VerificationSummary / VerifiedClaim schemas
    index.ts                             — schemas barrel
```

Five files, two folders, zero deep imports. No `storage/`, `lifecycle/`,
`types/`, or state machine exist — deliberately (see "Why No Storage,
Lifecycle, or State Machine" in `MILESTONE_13_DESIGN.md` Section 9). A
`VerificationSummary` is a pure function of a `DecisionProfile` that some
other layer already stores; persisting a second copy here would have
duplicated data Decision Intelligence already owns.

`Source`/`Evidence` are never imported from `lib/research` directly.
`verification.schema.ts` reuses `DecisionProfileSchema.shape.sources` and
`.shape.evidence` (Zod's `.shape` accessor — the same technique
Milestone 12 established for `PipelineContextSchema.shape.decision`), so
the shape is sourced entirely from `lib/decision`'s own public schema
export.

## Relationship to Decision Intelligence

See `MILESTONE_13_DESIGN.md` Section 13 for the full comparison table.
In one line: Decision Intelligence **synthesizes** a `DecisionProfile`
from the five knowledge platforms; Verification **classifies and
organizes** an already-synthesized profile so a person can see what
backs it. Verification never recomputes confidence, never gathers new
evidence, and never generates a new `Finding` or `RiskFinding`.

## Public API

```ts
buildVerificationSummary(profile: DecisionProfile): VerificationSummary
buildVerificationSummaryFromSession(session: AnalysisSession): VerificationSummary | null
```

`buildVerificationSummaryFromSession` returns `null` for any session that
hasn't reached a completed `DecisionProfile` yet (`session.result` is
`undefined`) — never a partially-built summary.

```ts
interface VerificationSummary {
  confidence: DecisionConfidence;
  sources: Source[];
  sourceBreakdown: { totalSources: number; uniqueDomains: number };
  verifiedClaims: VerifiedClaim[];
  unverifiedStatements: string[];
  verificationCounts: { verifiedCount: number; unverifiedCount: number; verifiedRatio: number };
  generatedAt: string;
}

interface VerifiedClaim {
  kind: "finding" | "critical_risk";
  category: FindingCategory;
  severityLabel: string;
  summary: string;
  evidence: Evidence[];
  confidence: number;
}
```

## The Verified/Unverified Classification Rule

Exactly one rule, applied consistently: a claim is **verified** if it
carries at least one real `Evidence` entry, **unverified** otherwise.

- Every `Finding` in `DecisionProfile.keyFindings` is checked against
  this rule directly — only those with `evidence.length > 0` become a
  `VerifiedClaim`.
- Every `RiskFinding` in `DecisionProfile.criticalRisks` always
  qualifies, because `RiskFindingSchema` (Milestone 10) already enforces
  `evidence.length >= 1` structurally — a `RiskFinding` can never
  represent an unsupported claim.
- `unverifiedStatements` is `decisionLimitations` concatenated with
  `openQuestions`, unchanged — Decision Intelligence's own honest ledger
  of what it doesn't yet know, re-presented rather than re-derived.

`verificationCounts.verifiedRatio` is `verifiedCount / (verifiedCount +
unverifiedCount)`, or `0` when there is nothing to count — never
fabricated as a false positive.

## Runtime Verification

A temporary scratch page (`app/scratch-m13-verify/page.tsx`, deleted
before the final build) exercised `buildVerificationSummary` against a
hand-seeded `DecisionProfile` with:

- one `Finding` carrying real evidence, one carrying none,
- one `RiskFinding` (schema-guaranteed evidence-backed),
- three `Source`s across two distinct domains (one domain repeated),
- one `decisionLimitations` entry and one `openQuestions` entry.

All nine checks passed against the live dev server:

| Check | Result |
|---|---|
| `verifiedCount` = 2, `unverifiedCount` = 2, `verifiedRatio` = 0.5 | ✅ |
| `confidence` reused with the same values as the source profile (value-equality, not reference-identity — see "Lessons Learned") | ✅ |
| `sources` reused with the same values as the source profile | ✅ |
| The `RiskFinding` always lands in `verifiedClaims` | ✅ |
| The evidence-free `Finding` is excluded from `verifiedClaims` | ✅ |
| `uniqueDomains` counted correctly (2, from 3 sources) | ✅ |
| `totalSources` counted correctly (3) | ✅ |
| `buildVerificationSummaryFromSession` returns `null` before a session completes | ✅ |
| `buildVerificationSummaryFromSession` returns a real summary once a session completes | ✅ |

## Definition of Done — Verified

1. ✅ `lib/verification/` exists; `buildVerificationSummary` depends only
   on `lib/decision`'s public barrel; `buildVerificationSummaryFromSession`
   additionally depends only on `lib/analysis-session`'s public barrel.
   Zero deep imports (grep-verified).
2. ✅ No `storage/`, `lifecycle/`, or state machine exists — confirmed by
   directory listing (two folders total: `lib/verification/`,
   `lib/verification/schemas/`).
3. ✅ `confidence` and `sources` on every produced `VerificationSummary`
   carry the exact same values as the source `DecisionProfile` — verified
   at runtime, never recomputed.
4. ✅ `tsc --noEmit`, `eslint`, and `next build` all clean (zero new
   errors; the pre-existing `Testimonials.tsx` issue is unrelated and
   untouched).
5. ✅ This document.
6. ✅ Scratch verification page created, all nine scenarios passed,
   deleted before the final build.
7. ✅ `git status --short` shows only `lib/verification/` and this
   milestone's documentation — no frozen path touched.
8. ✅ Nothing committed; committing is a separate, explicitly-approved step.

## Risks Carried Forward From the Design (Now Confirmed or Resolved)

- **Naming risk — resolved before implementation.** The design review
  caught the same mistake Milestone 12 caught for `lib/session/`: naming
  a layer after one artifact (`TrustReport`) rather than the capability
  it provides. Resolved in the design phase itself by renaming to
  `lib/verification/` / `VerificationSummary` — no naming issue was
  discovered mid-build this time.
- **Honestly thin summaries in this environment — confirmed, by
  design.** With no search-provider credentials configured, most real
  `DecisionProfile`s today will have few sources and empty
  `deriveFindings()`/`deriveCriticalRisks()` results. A
  `VerificationSummary` built from such a profile correctly reports zero
  verified claims — this is the honest result, not a defect.
- **Upstream placeholders limit today's usefulness — unchanged, as
  expected.** `verifiedClaims` stays thin until `lib/decision`'s own
  `deriveFindings`/`deriveCriticalRisks` placeholders become real. No
  action needed in this module when that happens — see Future Extension
  Points.

## Future Extension Points

(Not built now — see `MILESTONE_13_DESIGN.md` Section 11 and Section 16's
Non-Goals for why.)

- Automatic enrichment of `verifiedClaims` once `lib/decision`'s
  placeholder finding/risk derivation becomes real — zero code changes
  needed in this module.
- Citation hyperlinking in a future dashboard, using
  `VerifiedClaim.evidence` directly.
- Cross-session trust comparison, once session history/versioning
  exists.
- A "trust score" badge built from `verificationCounts.verifiedRatio`,
  with a future UI free to label the rendered result "Trust Report" as a
  presentation choice — the module itself stays named for what it does.

## Lessons Learned

1. **What architectural decision proved correct?** Naming the layer for
   its capability (`Verification`) rather than one output artifact
   (`TrustReport`) — decided during design review, before any code
   existed — meant the implementation phase surfaced zero naming
   surprises, unlike Milestone 12's mid-build `lib/session/` rename.
2. **What limitation was discovered?** Not an implementation bug: the
   runtime verification page's first draft asserted reference-identity
   (`===`) between `VerificationSummary.confidence`/`.sources` and the
   source profile's own fields. `parseOrThrow`'s `schema.safeParse(...)`
   always returns a newly-constructed, re-validated object — so identity
   comparison is never the right check for data that has passed through
   any Zod schema. Fixed by comparing serialized values instead; the
   design's actual guarantee was value-equality all along, not object
   identity.
3. **What should the next milestone build on?** `buildVerificationSummary`
   and `buildVerificationSummaryFromSession` are ready for any future
   dashboard route to call directly — no further plumbing exists between
   "a completed session" and "a fully-typed, evidence-organized view of
   it." A future report builder in `lib/decision/` (or a UI) is the
   natural next consumer.
