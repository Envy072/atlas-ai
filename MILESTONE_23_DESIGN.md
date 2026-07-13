# Atlas AI — Milestone 23 Design Specification

**Business Intelligence Surfacing: Completing the Decision Report**

Status: **Design only. No code, no folders, no source files exist yet.**

This is the fourth and, per current scope, final Intelligence-surfacing
milestone in the Milestones 20–23 sequence. It follows the identical
architectural shape (pure UI projection, zero backend changes). Its
primary justification, per explicit design review, is **product
completion**: `BusinessProfile` is already part of the Decision model —
already discovered, already validated, already attached to every
`DecisionProfile` since Milestone 19 — and most of it simply remains
invisible to the user today. This milestone completes the existing
Decision Report by surfacing intelligence the platform already has, not
by adding a new capability. That the resulting card also happens to
complete the four-platform architectural pattern is a real, supporting
consequence, not the primary reason — and this document states plainly,
as before, that no `PRODUCT_BACKLOG.md` section names this work
directly.

---

## Pre-Design Verification

### Git state re-verified

`git log`/`git status` confirm Milestones 20–22 are committed and
pushed (`23ff23e`, `ab8c331`, `4eb36c2`), working tree clean.

### A correction to this milestone's own premise, stated directly

Re-read `PRODUCT_BACKLOG.md` fresh, grepped for every mention of
"business." **`PRODUCT_BACKLOG.md` has no "Business Intelligence"
section.** Its Priority 1 sections, in document order, are: Analysis
Experience, Trust & Evidence, Competitor Intelligence, Market
Intelligence, Financial Intelligence, **Startup Builder**. The only two
occurrences of the word "business" in the entire document are a passing
architecture-roadmap reference ("Research → Competitor → Market →
Financial → Business → Decision") and a single sentence in the Product
Vision section — neither is a Priority-1 ask for Business Intelligence
UI.

**This means the actual next `PRODUCT_BACKLOG.md`-ordered Priority 1
item is Startup Builder**, not Business Intelligence — consistent with
three prior audits (Milestones 20, 21, and 22 each independently
confirmed Startup Builder is "a multi-stage pipeline with no existing
schema anywhere, too large for a single milestone").

**Business Intelligence's real justification, stated honestly:** it is
primarily a **product-completion** argument, not a backlog mandate, and
architectural symmetry is a secondary, supporting consequence rather
than the reason itself. `BusinessProfile` is not hypothetical or
unbuilt data — it has been discovered, validated, and attached to every
`DecisionProfile` since Milestone 19, exactly like Competitor's,
Market's, and Financial's own profiles. The Decision Report today shows
a five-field slice of that already-existing intelligence
(`businessSummary` + SWOT) and silently withholds the rest. This
milestone's purpose is to finish showing what the Decision model already
knows — the same kind of completion a founder would expect from a
report that claims to synthesize "everything Atlas AI found," not a
separate architectural tidiness goal. That this also happens to close
the last gap in the four-platform Intelligence-card pattern is true and
worth noting, but it is not why this milestone exists. This milestone
proceeds on the product-completion basis above, and on this turn's
explicit instruction — not on a `PRODUCT_BACKLOG.md` citation invented
to match the pattern of Milestones 20–22.

### Current `DecisionReport.tsx`, read directly (not from memory)

Confirmed current state, post-Milestone-22:

```
TrustPanel → MarketIntelligenceCard → CompetitorIntelligenceCard →
FinancialIntelligenceCard → DecisionSummaryPanel
```

Business Intelligence's conceptual slot (between Competitors and
Financial) is, as documented in `DecisionReport.tsx`'s own comment,
currently omitted.

### Consumer & Dependency Audit

Confirmed via grep: **zero** components anywhere render the full
`businessProfile` object. `DecisionSummaryPanel.tsx` **does** already
render a narrow, curated subset — `businessSummary`
(`businessModel`/`valueProposition`/`customerProblem`/
`competitivePosition`/`overallHealth`) and the top-level
`strengths`/`weaknesses`/`opportunities`/`threats` (Business's own SWOT,
flattened onto `DecisionProfile` since Milestone 10, extended with the
full `businessProfile` object at Milestone 19). This is the same
situation Milestone 19's own backend design found: **a five-field
window has existed since Milestone 10; twelve real fields have never
reached any UI at all.**

### Full `BusinessProfile` schema, read directly

`lib/business/schemas/business.schema.ts` plus every sub-schema it
imports (`enums.ts`, `moat.schema.ts`, `health.schema.ts`,
`execution.schema.ts`, `risk.schema.ts`) were read in full:

```
BusinessProfile
├── id
├── businessModel?, valueProposition?, customerProblem?     — ALREADY surfaced via businessSummary
├── customerSegments: CustomerSegment[]                      — NOT surfaced (reuses lib/market's schema)
├── revenueStrategy?                                          — NOT surfaced
├── goToMarketStrategy?, distributionChannels: string[]        — NOT surfaced
├── growthStrategy?, growthDrivers: string[],
│   expansionOpportunities: string[]                          — NOT surfaced
├── competitivePosition?                                       — ALREADY surfaced via businessSummary
├── competitiveAdvantages: string[]                            — NOT surfaced
├── economicMoat: { type?, strengthScore?, rationale? }        — NOT surfaced
├── executionComplexity?                                       — NOT surfaced
├── keyDependencies: Dependency[]                              — NOT surfaced
├── operationalRisks: OperationalRisk[]                        — NOT surfaced
├── businessStrengths/Weaknesses/Opportunities/Threats         — ALREADY surfaced (top-level SWOT)
├── overallHealth: { rating?, rationale? }                     — ALREADY surfaced via businessSummary
├── sources, evidence, confidence, refresh                     — profile-level, not yet surfaced as its own view
```

**Twelve real fields never reach any UI today**: `customerSegments`,
`revenueStrategy`, `goToMarketStrategy`, `distributionChannels`,
`growthStrategy`, `growthDrivers`, `expansionOpportunities`,
`competitiveAdvantages`, `economicMoat`, `executionComplexity`,
`keyDependencies`, `operationalRisks`. This is this milestone's actual
gap analysis — there is no backlog table to build against, so the
comparison is "already surfaced via the narrow Milestone-10 window" vs.
"never surfaced," not "backlog ask vs. schema support."

**Confirmed, re-verified directly (not assumed unchanged since
Milestone 19):** every one of these twelve fields is still an honest,
architecture-only placeholder in this environment — `buildBusinessProfile()`
(unchanged since Milestone 19) never populates `economicMoat.type`,
`executionComplexity`, `keyDependencies`, `operationalRisks`,
`goToMarketStrategy`, `growthStrategy`, or `competitiveAdvantages` with
real synthesized content; only `customerSegments` (reused verbatim from
Market) and `revenueStrategy` (reused from Financial's pricing
rationale) carry real, discovered content today.

### Legacy precedent audit

`components/workspace/BusinessModelCard.tsx` and
`components/workspace/report/BusinessModelSection.tsx` (legacy,
orphaned) render only freeform prose from `AnalysisResult`'s
`business_model`/`problem`/`solution` fields — no structural precedent,
no chart, no fabrication risk of the `MarketChart.tsx`/`FinancialCard.tsx`
kind found in Milestones 21/22. Frozen, not touched.

---

## 1. Purpose

Complete the Decision Report by adding `BusinessIntelligenceCard`,
rendering the full `DecisionProfile.businessProfile` object (the real,
validated `BusinessProfile` Milestone 19 already exposes and already
attaches to every `DecisionProfile`) between `CompetitorIntelligenceCard`
and `FinancialIntelligenceCard`. The primary goal is surfacing
already-existing, already-validated intelligence the report currently
withholds — not adding a new capability, and not chiefly about
architectural symmetry across the four platforms (a true, secondary
consequence of this same work). Being explicit that most of what this
reveals is structural readiness (honest placeholders), not new real
content, since `buildBusinessProfile()` itself has not changed since
Milestone 19.

## 2. Product Vision

> A founder reading the Decision Report today sees a five-field summary
> of the business model and a SWOT — but the Decision model has already
> discovered and validated go-to-market strategy, growth levers,
> economic moat, execution complexity, and key dependencies since
> Milestone 19, and none of it has ever been shown. This is unfinished
> business, not a missing feature: the report already claims to
> synthesize what Atlas AI found, and right now it doesn't. This
> milestone doesn't make any of that content real; it finishes showing
> what the platform already knows, honest placeholders included — the
> same kind of report-completion Milestones 20–22 already performed for
> their own platforms.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| What's the go-to-market strategy and which channels? | Structurally reachable, honestly absent today (no real call site populates it). |
| What are the growth levers and expansion opportunities? | Same — structurally reachable, honestly absent. |
| Is there a defensible economic moat? | The *category the schema supports* — yes. The *actual assessment* — no, `economicMoat.type` is never populated by any real call site. |
| How complex is execution, and what does it depend on? | Structurally reachable, honestly absent. |
| What operational risks exist? | Structurally reachable, honestly absent. |
| What's the business model, value proposition, and overall health? | **Already answered today** via `DecisionSummaryPanel`'s `businessSummary` — unchanged by this milestone. |

## Architectural Discovery

This is the **fourth UI-layer milestone**, following the exact
precedent Milestones 20/21/22 established. Per `CLAUDE.md`'s layering
rules, the correct home remains `components/workspace/decision-report/`
— never `lib/business/` or `lib/decision/`, both of which already fully
expose `businessProfile` on every `DecisionProfile` since Milestone 19.

**A genuinely different starting condition from the other three cards:**
Competitor, Market, and Financial each started from *zero* surfaced
fields. Business starts from *five already-surfaced* fields
(`businessSummary` + top-level SWOT). This card must be additive to that
existing narrow window, not a replacement or a duplicate — the same
"one source, two projections" shape Milestone 19 already established at
the schema level, now extended to the UI level: `DecisionSummaryPanel`
keeps rendering its five-field summary unchanged; `BusinessIntelligenceCard`
renders the full object, including those same five fields *again* as
part of the complete picture, exactly as `CompetitorIntelligenceCard`'s
per-company fields sit alongside (not instead of) `VerificationSummary`'s
own aggregate evidence view.

**Rendering shape:** closest to `FinancialIntelligenceCard`'s and
`MarketIntelligenceCard`'s "one object, many independent facets" shape,
not Competitor's "list of N similar records" shape.

## Knowledge vs Observation

Restated and extended for this platform's own field mix, using the
three-way distinction this design review specifically requires
(durable knowledge / operational observations / derived judgments) —
refining, not repeating, Milestone 19's original two-and-a-half-way
split:

- **Durable business knowledge** — `businessModel`, `valueProposition`,
  `customerProblem`, `revenueStrategy`, `goToMarketStrategy`,
  `distributionChannels`, `growthStrategy`, `growthDrivers`,
  `expansionOpportunities`, `competitiveAdvantages`, `customerSegments`.
  These describe *choices and structure* — a go-to-market strategy
  doesn't change hour to hour the way an MRR figure does.
- **Operational observations** — `keyDependencies`, `operationalRisks`.
  These describe *the current state of how the business operates* (what
  it currently relies on, what risk currently exists) — not a metric
  with a fluctuating numeric value, but not a permanent structural fact
  either; a dependency or risk can appear, resolve, or change as
  operations evolve, without ever being "point-in-time" the way an
  `mrr` figure is.
- **Derived business judgments** — `economicMoat`, `overallHealth`,
  `executionComplexity`. Confirmed, re-reading `mergeBusinessProfile()`'s
  own comment directly: *"Deliberately does NOT touch `economicMoat`,
  `overallHealth`, or `executionComplexity` — those are only ever
  recomputed by a future real-assessment module, never hand-merged."*
  These are outputs of a future real-assessment process and must always
  be derived fresh from current structural facts, never patched
  piecemeal — unchanged reasoning from Milestone 19, re-verified here.

This categorization has no bearing on accumulation (this milestone
introduces no persistence, exactly like Milestones 20–22), but it
directly shapes the presentation decision below.

## Which information belongs in KPI/stat form vs. structured sections

- **KPI/stat form** (single scalar or categorical value): `overallHealth.rating`
  (a badge/stat, with `rationale` as a caption when present),
  `economicMoat.type` + `economicMoat.strengthScore` (a stat, when
  present — `type` as a label, `strengthScore` as a number, both
  honestly absent today), `executionComplexity` (a badge/stat),
  `competitivePosition` (already shown via `businessSummary`, not
  duplicated here — see Risks), `confidence` (a stat, matching every
  prior card's own confidence stat).
- **Structured (list) sections**: `customerSegments` (with pain
  points, matching `MarketIntelligenceCard`'s own segment rendering
  exactly, since it's the identical reused schema), `growthDrivers`,
  `expansionOpportunities`, `distributionChannels`, `competitiveAdvantages`
  (badge-list style, matching Competitor/Market/Financial's own
  tag-list conventions), `keyDependencies` (with criticality severity,
  matching Market/Financial's severity-badge convention),
  `operationalRisks` (with severity, same convention).
- **Narrative (single-string) fields, rendered as short text within a
  section, not squeezed into a stat cell**: `revenueStrategy`,
  `goToMarketStrategy`, `growthStrategy` — free-text strategy
  descriptions, not scalar facts.

## Whether any visualization is justified by the current schema

**No — evaluated directly, not assumed from precedent alone.** The one
candidate worth naming explicitly: `economicMoat.strengthScore` is a
single 0–100 number, superficially similar to a progress-bar-style
indicator. Considered and rejected for the same reason a chart was
rejected in Milestones 21/22: it is a single, usually-absent scalar
value, not a trend or a comparison across multiple real data points — a
progress-bar/gauge visual would imply a precision and a "how full is the
bar" comparative framing this one honestly-often-absent number doesn't
support. Rendered as a plain labeled stat, identical treatment to every
other scalar value in this sequence, per the same "the honesty is in the
content, not a new visual hierarchy" principle Milestone 22 established
for `ltvToCac`. No field on `BusinessProfile` is a time series or a
multi-point comparison; no chart, gauge, or sparkline of any kind is
introduced.

## Identity Model / Discovery Strategy

Not applicable — no new identity or accumulation concept introduced;
`discoverBusiness()` is entirely unchanged. This milestone consumes
already-produced output.

## Evidence / Confidence Strategy

**Evidence:** profile-level `sources`/`evidence` already feed
`VerificationSummary`'s aggregation (Milestone 19, unchanged). This card
is a second, additive view of a subset of that evidence, identical in
shape to the three prior cards' own "one source, two projections"
precedent.

**Confidence:** `businessProfile.confidence` renders as a stat, direct
passthrough, matching every prior card's own confidence stat.

## Decision / Verification / Pipeline Relationship

**No `lib/business/`, `lib/decision/`, `lib/verification/`, or
`lib/pipeline/` change of any kind.** `DecisionProfile.businessProfile`
already exists (Milestone 19); this milestone adds a consumer only.
`DecisionSummaryPanel`'s existing `businessSummary`/SWOT rendering is
**not modified, renamed, or recomputed** — the same explicit,
load-bearing decision Milestone 19 itself made at the schema level, now
reaffirmed at the UI level.

## Data Flow

```
DecisionReport({ profile, verification })
  │
  ├─ TrustPanel({ verification })                                          UNCHANGED
  ├─ MarketIntelligenceCard({ market: profile.marketProfile })             UNCHANGED (Milestone 21)
  ├─ CompetitorIntelligenceCard({ competitors: profile.keyCompetitors })   UNCHANGED (Milestone 20)
  ├─ BusinessIntelligenceCard({ business: profile.businessProfile })       NEW
  ├─ FinancialIntelligenceCard({ financial: profile.financialProfile })    UNCHANGED (Milestone 22)
  └─ DecisionSummaryPanel({ profile })                                     UNCHANGED — last, still
                                                                            renders businessSummary/SWOT
```

`profile.businessProfile` (present on every `DecisionProfile` since
Milestone 19 — always a real object, never undefined) is passed
straight through — no new prop threading, no new fetch, no new hook, no
mapping function.

## Why no ViewModel, DTO, mapper, or duplicate representation

The component's prop is `business: BusinessProfile` — the exact type
Milestone 19 established, the same type
`DecisionProfileSchema.businessProfile: BusinessProfileSchema` already
uses. No interface redeclares any field under a new name; every JSX
expression reads a field directly off the `BusinessProfile` instance
passed in. The only transformations applied are display formatting
(reusing `lib/format.ts`'s existing helpers where applicable — e.g.
`formatPercent` for `confidence`/`economicMoat.strengthScore`) — the
identical formatting-vs-structure distinction every prior card in this
sequence has already established.

## Why no changes are required in `lib/business`

`BusinessProfileSchema` already contains every field this card renders;
`discoverBusiness()` already produces a complete, schema-valid
`BusinessProfile` on every `DecisionProfile`. This milestone's entire
task is adding a reader in `components/`.

## Why `BusinessProfile` remains the single source of truth

`lib/business/schemas/business.schema.ts` remains the **one** place
this shape is defined. The card neither recomputes a value the schema
doesn't already carry nor introduces a second definition of any field —
and, critically, it does not fork `businessSummary`/top-level SWOT into
a second, competing representation: those remain
`DecisionSummaryPanel`'s own projection, untouched, while this card
reads the same underlying `businessProfile` object in full.

## Why this should remain a pure UI projection, exactly like Milestones 20–22

Identical justification structure: zero backend changes, one new
additive component, one new child in `DecisionReport.tsx` at its
conceptually-correct position, reuse of existing shared/ui primitives
only. No new architectural pattern is introduced; this is a fourth
application of an already-approved shape.

## Should `BusinessIntelligenceCard` conceptually appear between
Competitor and Financial?

**Yes, re-evaluated directly and reaffirmed, not merely inherited.** The
reasoning Milestone 21 gave still holds under direct scrutiny: a
business model's differentiation and moat can only be meaningfully
judged once the reader already knows the market context (Market) and
who else occupies the space (Competitors) — positioning claims read as
unfounded without that context immediately before them. Financial
viability, in turn, is downstream of the business model and go-to-market
strategy that produce it — showing Financial before Business would
invert cause and effect (Milestone 21's own reasoning, restated because
it is now actually being tested by a real implementation rather than a
hypothetical future slot). The conceptual ordering
(Trust → Market → Competitors → Business → Financial → Decision
Summary) is confirmed correct and will now be fully populated for the
first time.

## Risks

- **The honestly-empty case is the overwhelming default**, more so than
  any prior card — of `BusinessProfile`'s 21 substantive fields, only
  `businessModel`, `customerSegments`, and `revenueStrategy` carry real
  content in this environment today; the other eighteen render honest
  absence. Every stat and list section must reflect this without
  exception.
- **Duplication perception, more acutely than Milestone 19's own
  version of this risk** — this card renders `businessModel`,
  `valueProposition`, `customerProblem`, `competitivePosition`, and
  `overallHealth` a *second* time (having already been shown via
  `businessSummary`), immediately visible to a reader scrolling from
  `CompetitorIntelligenceCard` into this new card and then into
  `DecisionSummaryPanel` shortly after. Mitigated by the same "one
  source, two projections, not competing sources of truth" reasoning
  Milestone 19 already established and this design reaffirms — but
  worth flagging as a slightly sharper version of that risk than
  Milestone 19 faced, since the *reader* now encounters both
  projections in the same scrolling session, not just in the data
  model.
- **A reader might expect `economicMoat.strengthScore` to be visualized**
  given its 0–100 numeric shape resembles a typical "score" UI element
  elsewhere in this product (e.g., the legacy `AnalysisResult.score`).
  Mitigated by this design's own direct rejection of a gauge/progress-bar
  treatment (Visualization section above).

## Design Deviations

None found requiring a fix this milestone.

## Non-Goals

- Does not modify, rename, or recompute `DecisionSummaryPanel`'s
  existing `businessSummary`/SWOT rendering.
- Does not add any new field to `BusinessProfileSchema` or any other
  `lib/business/` file.
- Does not render any chart, gauge, sparkline, or progress-bar
  visualization of any kind.
- Does not modify `lib/business/`, `lib/decision/`, `lib/verification/`,
  or `lib/pipeline/` in any way.
- Does not touch the legacy `AIWorkspace`/`BusinessModelCard.tsx`/
  `BusinessModelSection.tsx` flow — frozen, orphaned.
- Does not extract any shared UI primitive (`StatCell`, `EvidenceList`,
  a severity-tone map, or a tag-badge-list helper) — see Complexity
  Review; this remains explicitly deferred.
- Does not implement Startup Builder, which remains the actual next
  `PRODUCT_BACKLOG.md`-ordered Priority 1 item (Pre-Design Verification).

## Complexity Review

- **Whether Business Intelligence UI is justified at all without a
  `PRODUCT_BACKLOG.md` mandate was directly challenged** — resolved by
  stating the real justification honestly: this is primarily report
  completion (already-validated `BusinessProfile` data the Decision
  Report currently withholds), with architectural symmetry across the
  four platforms as a true but secondary consequence, plus this turn's
  explicit instruction — not a fabricated backlog citation.
- **Whether `economicMoat.strengthScore` warrants a gauge/progress-bar
  was directly challenged and rejected** (Visualization section).

### Cross-card architectural review (four cards now fully specified)

With `BusinessIntelligenceCard`'s shape now designed, all four
Intelligence cards' patterns are visible together for the first time —
the explicit review this milestone was asked to perform, **without
extracting anything yet**:

| Pattern | Occurrences (post-Milestone-23) | Cards |
|---|---|---|
| Stat cell (label / value / methodology-or-rationale caption) | **4** | `TrustPanel.ConfidenceStat`, `MarketIntelligenceCard.SizeStat`, `FinancialIntelligenceCard.FinancialStat`, this milestone's own business stats |
| Evidence-list-with-source-link (`<ul><li>{text} <a>(source)</a></li></ul>`) | **4** | `TrustPanel` (per-claim), `CompetitorIntelligenceCard`, `MarketIntelligenceCard`, `FinancialIntelligenceCard` — this milestone adds a 5th |
| Severity → badge-tone map (`low`/`medium`/`high` → `secondary`/`warning`/`destructive`) | **2**, becoming **3** | `MarketIntelligenceCard`, `FinancialIntelligenceCard` — this milestone's `keyDependencies`/`operationalRisks` would add a third, byte-identical map |
| Flex-wrap badge list (tags/features/tiers/streams/expenses) | **3**, becoming **4** | `CompetitorIntelligenceCard`, `MarketIntelligenceCard`, `FinancialIntelligenceCard` — this milestone's `distributionChannels`/`competitiveAdvantages` would add a 4th |
| `EmptyState` usage | **1** (already a shared primitive, no debt) | `CompetitorIntelligenceCard` only — Market/Financial/Business never render a fully-empty state, since each always has header-level context (industry, revenue model, business model) even when every stat is absent |

**Finding: every candidate except `EmptyState` (already properly
shared) has now crossed this project's own three-repetition threshold**
(`CLAUDE.md` Section 11) — in most cases by a wide margin (4–5
occurrences, not the minimum 3). This is a stronger, more evidenced case
than Milestone 22's own postponed `StatCell` recommendation, which had
only found 3 occurrences of one pattern.

**Recommendation: yes, Milestone 24 should become a dedicated "Decision
Report Architecture Cleanup" milestone**, scoped to exactly these four
extractions (`StatCell`, `EvidenceList`, a shared severity-tone map,
and a tag-badge-list helper), performed once — after this milestone, not
before, and not deferred further. The reasoning against waiting longer:
there is no fifth Intelligence card currently planned (`PRODUCT_BACKLOG.md`
names no more Intelligence-domain UI work; Startup Builder is a
different kind of feature entirely, not another card in this family), so
"wait for the complete pattern to be visible" — Milestone 22's own
stated condition for deferring — is now satisfied. Waiting further would
not surface new information; it would only let a fifth and sixth
near-identical implementation accumulate if any further card work
happens first. **This milestone does not perform the extraction** — it
documents the now-complete evidence for Milestone 24 to act on directly,
without re-deriving it.

## Performance Review

- **Computational hotspots:** none — rendering a single, already-fetched
  object; no new computation, no new request.
- **Memoization:** none added by default.
- **Scaling risk:** none identified.

## Deterministic Reasoning

Trivially satisfied, consistent with every prior milestone in this
sequence — pure presentation over already-validated, deterministic
data. No LLM involvement is introduced or appropriate.

## Design Debt

1. **Four shared-primitive extraction candidates now confirmed past
   the three-repetition threshold** (Complexity Review) — not resolved
   this milestone; explicitly recommended for Milestone 24.
2. **Eighteen of `BusinessProfile`'s 21 substantive fields remain
   architecture-only placeholders** — unchanged debt from Milestone 19,
   restated here since this milestone makes that gap visible in the UI
   for the first time rather than closing it.
3. **Startup Builder remains the actual next `PRODUCT_BACKLOG.md`
   Priority 1 item**, unaddressed across four consecutive milestone
   audits now (20, 21, 22, 23).

## Product Readiness

Honest assessment: this milestone makes the complete `BusinessProfile`
visible in the Decision Report for the first time — completing a report
that already claimed to synthesize Business Intelligence but only ever
showed a five-field slice of it. That is the primary product outcome;
completing the four-platform Intelligence card family architecturally
is a true, secondary consequence of the same work, not the reason for
it. No `PRODUCT_BACKLOG.md` section names this specifically, and no user
testing asked for it — the justification rests on the report's own
existing, implicit promise to show what Atlas AI found, not on a
tracked complaint. Most of what becomes visible is honest absence, not
new real content, since `buildBusinessProfile()` itself remains exactly
as placeholder-heavy as Milestone 19 left it.

## Future Growth

- **Milestone 24 — Decision Report Architecture Cleanup**, per the
  Complexity Review's cross-card finding: extract `StatCell`,
  `EvidenceList`, a shared severity-tone map, and a tag-badge-list
  helper to `components/shared/`, retrofitting all four existing
  Intelligence cards without changing any of their rendered output.
- **If a real strategic-assessment methodology is ever built** for
  `economicMoat`/`executionComplexity`/`overallHealth`, this card's
  existing stat cells absorb real values automatically.
- **Startup Builder** remains the next genuinely `PRODUCT_BACKLOG.md`-
  ordered Priority 1 item, still requiring its own schema and design
  work before it can be scoped as a milestone.

## Definition of Done

1. New file `components/workspace/decision-report/BusinessIntelligenceCard.tsx`
   — a single-responsibility presentational component taking
   `business: BusinessProfile` and rendering: business model/value
   proposition/customer problem context (mirrored from `businessSummary`,
   not fetched separately — same underlying object), a stat row
   (overall health, economic moat, execution complexity, confidence),
   narrative strategy fields (revenue strategy, go-to-market strategy,
   growth strategy), and conditionally-rendered list sections (customer
   segments, growth drivers, expansion opportunities, distribution
   channels, competitive advantages, key dependencies, operational
   risks) plus profile-level evidence — matching the established
   honest-absence and conditional-rendering conventions exactly, with
   local (not shared) stat-cell/evidence-list/severity-map markup, per
   the explicit deferral to Milestone 24.
2. `DecisionReport.tsx` renders `<BusinessIntelligenceCard business={profile.businessProfile} />`
   between `CompetitorIntelligenceCard` and `FinancialIntelligenceCard`,
   per the reaffirmed conceptual ordering.
3. `DecisionSummaryPanel.tsx` is not modified.
4. Zero chart, gauge, or sparkline visualization anywhere in the new
   component.
5. Zero changes anywhere under `lib/`.
6. Zero shared-primitive extraction this milestone (deferred to
   Milestone 24, per Complexity Review).
7. Manually verified against the running dev server for both the
   honestly-mostly-empty path (realistic default — only `businessModel`/
   `customerSegments`/`revenueStrategy` populated) and a more fully
   populated fixture path (temporary scratch page, deleted before final
   build), following the established Client-boundary precedent.
8. `tsc --noEmit`, `eslint`, `next build` all clean.
9. `git status --short` touches only the new component file and the
   small addition to `DecisionReport.tsx`.
10. Nothing committed until explicitly requested.

---

*End of design specification. Awaiting review before any implementation
begins.*
