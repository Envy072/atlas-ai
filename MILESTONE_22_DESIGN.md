# Atlas AI — Milestone 22 Design Specification

**Financial Intelligence Surfacing: Honest Numbers, No Invented Curves**

Status: **Design only. No code, no folders, no source files exist yet.**

This is the third UI-surfacing milestone in the Milestones 20–21
sequence. It follows the identical architectural shape (pure UI
projection, zero backend changes) while resolving one real ordering
question left open by Milestone 21's own canonical-ordering decision,
and applying a materially stricter "never fabricate" analysis than
either prior milestone needed, because `FinancialProfile` has less
temporal structure than `MarketProfile` did.

---

## Pre-Design Verification

### Git state re-verified

`git log`/`git status` confirm Milestones 20 and 21 are committed and
pushed (`23ff23e`, `ab8c331`), working tree clean — the recap is
accurate this time.

### Re-reading `PRODUCT_BACKLOG.md` directly

Re-read fresh. Priority 1's remaining items after Milestone 21, in the
document's own order: **Financial Intelligence**, then **Startup
Builder**. Financial Intelligence's exact asks:

> "Financial section is too short. Need real calculations. Revenue
> assumptions. CAC/LTV explanation. Break-even analysis. Sensitivity
> analysis. Sources for every financial estimate."

**Verified directly, not assumed:** grep-confirmed **zero** consumers of
`DecisionProfile.financialProfile` anywhere in `components/`, `app/`, or
`lib/verification/`. Genuinely open, exactly like Competitor and Market
were before their own milestones.

**Startup Builder** — unchanged finding from Milestones 20/21: a
multi-stage pipeline with no existing schema anywhere, too large for one
milestone.

### Full `FinancialProfile` schema, read directly (not from memory)

`lib/financial/schemas/financial.schema.ts` plus every sub-schema it
imports (`estimate.schema.ts`, `revenue.schema.ts`, `costs.schema.ts`,
`pricing.schema.ts`, `fundingStage.schema.ts`, `risk.schema.ts`) were
read in full, and — because forecasting/valuation are named in
`FINANCIAL_PLATFORM.md`'s own architecture — `forecast.schema.ts` and
`valuation.schema.ts` were also read directly to check whether either
reaches `FinancialProfile`:

```
FinancialProfile
├── id
├── revenueModel?, pricingStrategy?, costStructure?
├── grossMargin, operatingMargin, burnRate, runway, breakEven,
│   cac, ltv, ltvToCac, mrr, arr, paybackPeriod   — 11× FinancialEstimate
│                                                    { value?, unit?, methodology?, confidence? }
│                                                    (NO asOfYear field — unlike MarketSizeEstimate)
├── revenueStreams: RevenueStream[]     — { name, description?, revenueModel?, estimatedMonthlyUsd? }
├── expenses: Expense[]                 — { name, category?, estimatedMonthlyUsd? }
├── fundingStage?                        — enum, pre_seed…public
├── financialRisks: FinancialRisk[]     — { category, name, description?, severity? }
├── financialAssumptions: string[]
├── sources, evidence, confidence, refresh
```

**A decisive finding:** `ForecastModelSchema` (three scenarios ×
`{mrr, arr, burnRate, runway}`) and `ValuationEstimateSchema` (four
methods, each an unset `FinancialEstimate`) exist as real, exported
types (`lib/financial/forecast/forecastEngine.ts`,
`lib/financial/valuation/valuationModels.ts`, both re-exported from
`lib/financial`'s public barrel) — **but neither is a field on
`FinancialProfileSchema`.** Grep-confirmed: `financialProfileBuilder.ts`
never mentions "forecast" or "valuation" anywhere, and
`buildForecastModel`/`buildForecastSet`/`buildValuationEstimates` have
**zero callers outside their own defining files and the barrel that
re-exports them.** This means forecasts and valuations are not merely
"architecture-only" the way `economicMoat` or `executionComplexity`
were for Business — they are **structurally unreachable from
`DecisionProfile.financialProfile`**. This UI card cannot render them
not by design restraint alone, but because the data literally never
arrives at this prop. Stated as a verified fact, not an assumption.

### Consumer & Dependency Audit

Confirmed via grep: **zero** components anywhere render
`financialProfile`. `DecisionReport.tsx` (current, post-Milestone-21)
renders exactly `TrustPanel`, `MarketIntelligenceCard`,
`CompetitorIntelligenceCard`, `DecisionSummaryPanel` — no fifth child
yet.

### Legacy precedent audit — a second confirmed fabrication pattern

`components/workspace/FinancialCard.tsx` (legacy, orphaned) renders
prose from `AnalysisResult` plus a **hardcoded, static "Financial
Recommendation" paragraph** — generic advice text ("Focus on validating
revenue with a small group of paying customers...") that is not derived
from any real analysis, the same class of fabrication
`MarketChart.tsx`'s hardcoded chart data represented at Milestone 21.
`components/workspace/report/FinancialSection.tsx` is more honest by
its own admission — its own comment states *"AnalysisResult has no
revenue/valuation projections to show, so none are invented"* — the
correct instinct this milestone must also apply to the live,
`FinancialProfile`-based card. Both legacy files are frozen and not
touched.

### The conceptual ordering, and how an absent section is handled

Milestone 21 established a conceptual, information-architecture-driven
ordering — not a set of literal, renumbered DOM slots:

```
Trust → Market → Competitors → Business → Financial → Decision Summary
```

This ordering is fixed and does not get renumbered based on which
sections currently exist. **`PRODUCT_BACKLOG.md` does not name Business
Intelligence as a priority item at all** (confirmed again this
milestone, consistent with Milestones 20/21's own audits) — it remains
unscheduled. Since `BusinessIntelligenceCard` doesn't exist yet, it is
simply **omitted** from the rendered sequence today — the conceptual
position it will eventually occupy (between Competitors and Financial)
is not filled by anything else, and `FinancialIntelligenceCard` does not
inherit or get renumbered into that slot; it is rendered immediately
after whichever conceptually-earlier sections currently exist, per the
same "omit what's absent, never renumber" rule. When Business
Intelligence is eventually built, it inserts into its already-reserved
conceptual position between Competitors and Financial, and nothing about
Financial's own definition changes as a result.

### Schema-to-backlog gap analysis

| Backlog ask | Schema support |
|---|---|
| "CAC/LTV explanation" | ✅ `cac`/`ltv`/`ltvToCac`, each a full `FinancialEstimate` — real `methodology` note present even when `value` is absent, directly answering "explanation" independent of whether a number exists |
| "Revenue assumptions" | ✅ `financialAssumptions: string[]` (always 2 real, evidence-backed strings per `buildInitialAssumptions()`, confirmed at Milestone 18) + `revenueStreams[]` |
| "Sources for every financial estimate" | ⚠️ Partial, same honest caveat as Competitor/Market — `sources`/`evidence` exist at the **profile level**, not literally linked per individual estimate; this card presents the same profile-level evidence Milestones 20/21 already established as the correct honest granularity |
| "Break-even analysis" | ⚠️ Partial — `breakEven: FinancialEstimate` exists as a single stat with a methodology note; there is no "analysis" (no scenario comparison, no sensitivity) beyond that one estimate |
| "Need real calculations" | ⚠️ Partial, and this must be stated plainly — `computeLtvToCacRatio` is the **one** genuinely real, composed calculation in the entire platform (verified again this milestone, unchanged since Milestone 18); every other one of the 11 `FinancialEstimate` fields is an honest, unset architecture-only placeholder today |
| "Sensitivity analysis" | ❌ No field anywhere represents this concept — varying an assumption to observe an output's range is not modeled at all |

**Two of seven asks are well- or partially-supported with a real,
composed value (`ltvToCac`); the rest are satisfiable only as honest
methodology notes over absent numbers, or not representable at all.**
This is a starker ratio than Competitor's (5/9) or Market's (4/7 well
supported) — stated plainly, matching the project's standing discipline
of not glossing over a gap.

---

## 1. Purpose

Add `FinancialIntelligenceCard` to the live Decision Report, rendering
`DecisionProfile.financialProfile` (the real, validated `FinancialProfile`
Milestone 18 already builds) directly — closing the same class of gap
Milestones 20/21 closed for Competitor and Market, while being
significantly more conservative about what counts as "real calculations"
than the backlog's own wording might suggest, because most of this
platform's numeric fields are still honest placeholders.

## 2. Product Vision

> `PRODUCT_BACKLOG.md`'s own words ask for "real calculations" and
> "CAC/LTV explanation." Atlas AI has exactly one real calculation
> today (`ltvToCac`, composed live from real inputs whenever they
> exist) and eleven honest, methodology-documented placeholders. The
> product decision this milestone makes is to show that difference
> honestly — a real ratio when it exists, a real explanation of *how* it
> would be computed when it doesn't — rather than either hiding the gap
> or inventing a number to look complete.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| What's the CAC/LTV ratio, and is it healthy? | If both are real — yes, via `computeLtvToCacRatio`'s genuine composition. Today: no (both inputs absent), rendered as an honest "cannot be computed yet" with its own methodology note. |
| What's the revenue model and pricing strategy? | If discovered — `revenueModel`, `pricingStrategy.model`/`.rationale`. |
| What are the revenue assumptions behind this analysis? | Yes — `financialAssumptions`, always two real, evidence-backed statements. |
| What's the burn rate and runway? | Methodology — yes, always. Value — no, honestly absent. |
| Is there a break-even estimate? | As a single stat with methodology, not an "analysis." |
| Is there a sensitivity analysis? | **No** — not modeled anywhere; honestly out of scope. |
| What's the funding stage? | If discovered — `fundingStage`; typically absent today (Milestone 18's own finding: no real call site ever passes one). |
| What financial risks were identified? | If discovered — `financialRisks[]`, categorized, with severity. |

## Architectural Discovery

This is the **third UI-layer milestone**, following the exact precedent
Milestones 20/21 established. Per `CLAUDE.md`'s layering rules, the
correct home remains `components/workspace/decision-report/` — never
`lib/financial/` or `lib/decision/`, both of which already fully expose
`financialProfile` on every `DecisionProfile` since Milestone 18. This
milestone adds a reader, not a producer.

**Rendering shape, verified rather than assumed identical to the prior
two:** `FinancialProfile` is closer to `MarketProfile`'s "one object,
many independent facets" shape than to Competitor's "list of N similar
records" shape — matching Milestone 21's own precedent, not Milestone
20's. The facets split cleanly into: eleven scalar `FinancialEstimate`
stats (KPI-grid shaped), three small list facets (`revenueStreams`,
`expenses`, `financialRisks`), and two narrative facets
(`pricingStrategy`, `financialAssumptions`).

## Knowledge vs Observation

Restated and extended from Milestone 18's own backend-side finding
(`profileMerger.ts`'s own comment: *"never hand-merged, so a merge can
never silently overwrite a real estimate with a stale one"*) into its UI
consequence, exactly as Milestone 21 extended Milestone 17's equivalent
finding: **every one of the 11 `FinancialEstimate` fields is a
point-in-time observation with no temporal anchor at all** — not even
the single `asOfYear` field `MarketSizeEstimate` has. This is a
*stricter* case than Market's: Market's point-in-time estimates could at
least be labeled "as of 2025"; Financial's cannot be labeled with *any*
date, because the schema has no such field. Rendering any of these as
part of a chart would imply a false precision about *when* the value
applies, on top of implying a trend that was never measured.

**Distinguishing the four categories the design review requires:**

- **Single observations** — `mrr`, `arr`, `burnRate`, `runway`,
  `breakEven`, `cac`, `ltv` — each a single dollar/month figure with no
  claim about trajectory.
- **Ratios** — `grossMargin`, `operatingMargin` (percentages),
  `ltvToCac` (a dimensionless ratio, and the one genuinely *composed*
  value in the platform — computed live from `ltv`/`cac` via
  `computeLtvToCacRatio`, honestly propagating "unknown" when either
  input is absent).
- **Projections** — `ForecastModel` (three scenarios) is the platform's
  only projection-shaped concept, and it is **unreachable from
  `FinancialProfile`** (Pre-Design Verification) — not rendered this
  milestone, not because it's a bad idea, but because the data doesn't
  exist at this prop.
- **Historical series** — **none exist anywhere in this platform.** No
  field is an array of dated values; confirmed by the absence of even a
  single `asOfYear`-style field on `FinancialEstimateSchema`.

## Which financial values should be rendered as KPI/stat cards

All 11 `FinancialEstimate` fields, `revenueModel`, `fundingStage`, and
`costStructure`'s two monthly figures — each a single-value stat,
exactly the `SizeStat`/`ConfidenceStat` pattern Milestones 20/21 already
established (a value or "Not yet known", plus a methodology caption when
present). `ltvToCac` gets the same stat treatment, with its real,
composed value rendered as a real number precisely because it is one.

## Whether any existing field legitimately represents a time series

**No.** Verified directly (Pre-Design Verification, Knowledge vs
Observation) — no field on `FinancialProfile`, its sub-schemas, or the
unreachable `ForecastModel`/`ValuationEstimate` types is an array of
dated or sequenced values. The closest candidate, `ForecastModel`'s
three scenarios, is a same-instant comparison across *hypotheticals*
(best/base/worst case), not a trajectory over time, and is unreachable
from this card's data regardless.

## Whether any charts would be truthful today

**No — for two independent, compounding reasons, either of which alone
would already be disqualifying:** (1) no field is a time series, so any
line/area chart would fabricate intermediate points exactly as the
legacy `MarketChart.tsx` and (implicitly) `FinancialCard.tsx` already
did; (2) even a single-instant comparison chart (e.g., a bar chart of
the 11 estimates side by side) would visually imply all 11 are
comparably real, when in this environment 10 of 11 are honestly absent —
a bar chart with ten empty/zero-height bars and one real one
misrepresents "unknown" as "small," a distinct dishonesty this
project's schemas go out of their way to avoid (`FinancialEstimateSchema`'s
own doc comment: *"`value` is optional so 'we don't know this yet' is
representable without a sentinel like 0 or -1"* — a bar chart would
reintroduce exactly the sentinel-zero problem the schema was designed to
prevent).

## If charts are not justified, why they must not be introduced

Because this project's "never fabricate" principle is not limited to
inventing a number — visually implying a trend, a comparison, or a
scale that the underlying data doesn't support is a form of fabrication
even when every individual number shown is real. `CLAUDE.md`'s own
Definition of Done requires "no unrequested redesigns" and the
Deterministic Reasoning discipline established across every prior
milestone in this sequence applies here without modification: a chart
library's availability (`recharts`, confirmed present, unused since
Milestone 21) is not, by itself, justification for producing a chart the
data doesn't honestly support.

## Identity Model / Discovery Strategy

Not applicable — no new identity or accumulation concept introduced;
`discoverFinancials()` is entirely unchanged. This milestone consumes
already-produced output.

## Evidence / Confidence Strategy

**Evidence:** profile-level `sources`/`evidence` already feed
`VerificationSummary`'s aggregation (Milestone 18, unchanged). This card
is a second, additive view of a subset of that evidence, identical in
shape to Milestones 20/21's own "one source, two projections" precedent.

**Confidence:** `financialProfile.confidence` renders as a stat, direct
passthrough, exactly as the two prior cards already do for their own
`confidence` fields.

## Decision / Verification / Pipeline Relationship

**No `lib/financial/`, `lib/decision/`, `lib/verification/`, or
`lib/pipeline/` change of any kind.** `DecisionProfile.financialProfile`
already exists (Milestone 18); this milestone adds a consumer only.

## Data Flow

```
DecisionReport({ profile, verification })
  │
  ├─ TrustPanel({ verification })                                          UNCHANGED
  ├─ MarketIntelligenceCard({ market: profile.marketProfile })             UNCHANGED (Milestone 21)
  ├─ CompetitorIntelligenceCard({ competitors: profile.keyCompetitors })   UNCHANGED (Milestone 20)
  │  [BusinessIntelligenceCard — conceptual slot, omitted: not built, not scheduled]
  ├─ FinancialIntelligenceCard({ financial: profile.financialProfile })    NEW
  └─ DecisionSummaryPanel({ profile })                                     UNCHANGED — last
```

The conceptual ordering (Trust → Market → Competitors → Business →
Financial → Decision Summary) is unchanged and unrenumbered; Business's
slot is simply omitted from what actually renders today.

`profile.financialProfile` (present on every `DecisionProfile` since
Milestone 18 — always a real object, never undefined) is passed
straight through — no new prop threading, no new fetch, no new hook, no
mapping function.

## Why no ViewModel, DTO, mapper, or duplicate representation

The component's prop is `financial: FinancialProfile` — the exact type
Milestone 18 established, the same type
`DecisionProfileSchema.financialProfile: FinancialProfileSchema` already
uses. No interface redeclares any of the 11 estimates or the list facets
under a new name; every JSX expression reads a field directly off the
`FinancialProfile` instance passed in. The only transformations applied
are display formatting (`formatPercent` for percentage-unit estimates,
`formatCurrencyUsd` — reused verbatim from Milestone 21's own addition to
`lib/format.ts` — for dollar-unit estimates, a plain string for
ratio/months-unit estimates) — the identical formatting-vs-structure
distinction Milestones 20/21's own design reviews already established.

## Why no changes are required in `lib/financial`

`FinancialProfileSchema` already contains every field this card renders;
`discoverFinancials()` already produces a complete, schema-valid
`FinancialProfile` on every `DecisionProfile`. This milestone's entire
task is adding a reader in `components/`.

## Why `FinancialProfile` remains the single source of truth

`lib/financial/schemas/financial.schema.ts` remains the **one** place
this shape is defined. The card neither recomputes a value the schema
doesn't already carry (it does **not** re-run `computeLtvToCacRatio`
itself — `ltvToCac` arrives pre-computed on the profile) nor introduces
a second definition of any field.

## Why this should remain a pure UI projection, exactly like Milestones 20/21

Identical justification structure: zero backend changes, one new
additive component, one new child in `DecisionReport.tsx`, reuse of
existing shared/ui primitives and `lib/format.ts` helpers only. No new
architectural pattern is introduced by this milestone; it is a third
application of an already-approved shape.

## Risks

- **The honestly-empty case is the overwhelming default** — 10 of 11
  `FinancialEstimate` fields will typically show "Not yet known" in this
  environment; `revenueStreams`/`expenses`/`financialRisks` will often
  be empty. Every stat must render its honest-absence state; every list
  section must be conditionally rendered only when non-empty (Milestones
  20/21's established pattern).
- **A reader might expect a chart, dashboard-style KPI sparkline, or
  scenario comparison**, given how financial dashboards conventionally
  look elsewhere. Mitigated by this design's own direct, evidenced
  explanation of why none of that is truthful today (sections above).
- **A reader might conflate the one real number (`ltvToCac`) with the
  ten placeholders around it** if they're all styled identically.
  Mitigated at implementation time by ensuring the real, composed
  `ltvToCac` value (when present) is visually indistinguishable in
  *styling* from the others' real values (never a special "verified"
  badge that implies the others are somehow less trustworthy) — the
  honesty is in the *content* ("Not yet known" vs. a real number), not a
  new visual hierarchy invented for this one field.

## Design Deviations

None found requiring a fix this milestone. The forecast/valuation
unreachability (Pre-Design Verification) is a real architectural gap but
lives entirely in `lib/financial/`'s own construction logic, which this
milestone does not touch — recorded as Design Debt, not a deviation to
fix here.

## Non-Goals

- Does not render `forecast`/`valuation` data — structurally unreachable
  from `DecisionProfile.financialProfile` (Pre-Design Verification), not
  a scope choice.
- Does not add a sensitivity-analysis concept to `FinancialProfileSchema`
  or any other `lib/financial/` file — not modeled, not fabricated.
- Does not render any chart, sparkline, or scenario comparison of any
  kind.
- Does not modify `lib/financial/`, `lib/decision/`, `lib/verification/`,
  or `lib/pipeline/` in any way.
- Does not touch the legacy `AIWorkspace`/`FinancialCard.tsx`/
  `FinancialSection.tsx` flow — frozen, orphaned.
- Does not redesign `TrustPanel`/`MarketIntelligenceCard`/
  `CompetitorIntelligenceCard`/`DecisionSummaryPanel` — additive only.
- Does not build `BusinessIntelligenceCard` — not a `PRODUCT_BACKLOG.md`
  priority; this milestone's position-4 placement does not require it
  to exist first (Pre-Design Verification).
- Does not implement Startup Builder.

## Complexity Review

- **Whether to use the already-installed `recharts` dependency for any
  part of this card was directly challenged and rejected** — the
  strongest, most explicit rejection in this sequence so far, given two
  independent disqualifying reasons (no time series; a same-instant
  comparison chart would misrepresent absence as smallness).
- **Whether to build a new shared "KPI stat grid" primitive now**,
  having used the same stat-cell pattern three times across Milestones
  20/21/22, **was directly challenged and evaluated against the
  three-repetition rule** — this is the *first* point in this sequence
  where the rule's own threshold is actually met (`ConfidenceStat` in
  `TrustPanel`, `SizeStat` in `MarketIntelligenceCard`, and this
  milestone's own stat cells are all structurally the same
  label/value/caption shape). **Decision: postponed, not rejected.** The
  pattern is correctly identified as meeting the three-repetition
  threshold, but the extraction itself is deliberately deferred until
  after Milestone 23, when Competitor, Market, Financial, and Business
  Intelligence cards can all be evaluated together and shared UI
  primitives extracted once the complete pattern across all four cards
  is visible — a single, well-informed extraction pass rather than one
  done mid-sequence. This milestone writes its own local stat-cell
  markup, matching Milestones 20/21's own local copies, not yet
  importing or creating a shared primitive.
- **Whether Financial should wait for Business to be built first**,
  given Milestone 21's numbered ordering, was directly challenged and
  resolved (Pre-Design Verification) — no, since Business isn't
  scheduled and the binding constraint is relative order among cards
  that exist, not literal position numbers.

## Performance Review

- **Computational hotspots:** none — rendering a single, already-fetched
  object with a fixed, small number of fields; no new computation, no
  new request.
- **Memoization:** none added by default.
- **Scaling risk:** none identified.

## Deterministic Reasoning

Trivially satisfied, and more emphatically so than Milestones 20/21 —
this milestone's entire Financial Visualization analysis exists
precisely to demonstrate why introducing anything resembling generative
or inferential logic (an LLM guessing at a plausible-looking chart,
projection, or sensitivity range) would be actively harmful here: a
fabricated financial figure is the single most convincing-looking kind
of fabrication this product could produce, and this project's own
`CLAUDE.md` identity ("Atlas AI... never invents statistics") makes this
the highest-stakes place in the whole Decision Report to hold that line.
No LLM involvement is introduced or appropriate.

## Design Debt

1. **Forecasts and valuations remain entirely unreachable from
   `DecisionProfile`** — real, exported, tested construction logic in
   `lib/financial/forecast/` and `lib/financial/valuation/` with zero
   callers anywhere, confirmed this milestone. A future
   milestone would need to first decide *whether* forecast/valuation
   data should ever reach `FinancialProfile` at all (a `lib/financial/`
   schema question, not a UI one) before any UI could honestly surface
   it.
2. **Sensitivity analysis has no schema representation anywhere** — a
   real, larger, future `lib/financial/` gap.
3. **The shared `StatCell` extraction** (Complexity Review) is
   deliberately postponed, not performed this milestone — by explicit
   decision, to be done after Milestone 23 once Competitor, Market,
   Financial, and Business Intelligence cards can all be evaluated
   together. Three local, near-identical stat-cell implementations
   (`ConfidenceStat`, `SizeStat`, and this milestone's own) exist in the
   meantime — acknowledged, deliberate, temporary debt, not an
   oversight.
4. **Business Intelligence UI remains unbuilt and unscheduled** —
   consistent with Milestones 20/21's own finding, not a surprise.

## Product Readiness

Honest assessment: this milestone makes the real methodology behind
CAC/LTV, revenue assumptions, and one genuinely composed ratio
(`ltvToCac`) visible for the first time, while being explicit that "real
calculations" is mostly not yet true of this platform — ten of eleven
numeric fields remain honest placeholders. This is a smaller, more
conservative product win than Milestones 20/21 delivered, and this
section says so directly rather than overstating it.

## Future Growth

- **If `discoverFinancials()` is ever extended to attach a real
  forecast or valuation to `FinancialProfile`** (a `lib/financial/`
  schema change, out of scope here), this card would need a
  corresponding, separately-designed addition — not a chart by default
  even then, since a scenario comparison is still not a time series.
- **If a real economics engine ever populates the remaining 10
  placeholder estimates**, this card's existing stat cells absorb real
  values automatically — no structural change needed.
- **Business Intelligence surfacing** remains unscheduled, pending a
  `PRODUCT_BACKLOG.md` ask that doesn't currently exist.
- **The `StatCell` shared primitive** (Complexity Review) — explicitly
  postponed until after Milestone 23, when Competitor, Market, Financial,
  and Business Intelligence cards can be evaluated together and shared UI
  primitives extracted once the complete pattern is visible, rather than
  mid-sequence.

## Definition of Done

1. New file `components/workspace/decision-report/FinancialIntelligenceCard.tsx`
   — a single-responsibility presentational component taking
   `financial: FinancialProfile` and rendering: revenue model, funding
   stage, and pricing-strategy context; a KPI stat grid for all 11
   `FinancialEstimate` fields plus the two `costStructure` figures
   (each honestly "Not yet known" with methodology caption when absent,
   a real formatted value when present); revenue streams, expenses, and
   financial risks as conditionally-rendered lists; financial
   assumptions as a list; a confidence stat; and profile-level evidence
   — matching the established honest-absence and conditional-rendering
   conventions exactly.
2. **No shared `StatCell` extraction this milestone** — postponed until
   after Milestone 23, per explicit decision (Complexity Review). This
   card writes its own local stat-cell markup.
3. `DecisionReport.tsx` renders `<FinancialIntelligenceCard financial={profile.financialProfile} />`
   immediately after `CompetitorIntelligenceCard`, consistent with the
   conceptual ordering (Trust → Market → Competitors → Business →
   Financial → Decision Summary) with Business's still-unbuilt slot
   simply omitted — not a renumbered position.
4. Zero chart, sparkline, or scenario-comparison visualization anywhere
   in the new component.
5. Zero changes anywhere under `lib/`.
6. Manually verified against the running dev server for both the
   honestly-empty path (realistic default) and a populated fixture path
   (temporary scratch page, deleted before final build), following the
   established Client-boundary precedent.
7. `tsc --noEmit`, `eslint`, `next build` all clean.
8. `git status --short` touches only the new component file and the
   small addition to `DecisionReport.tsx`.
9. Nothing committed until explicitly requested.

---

*End of design specification. Awaiting review before any implementation
begins.*
