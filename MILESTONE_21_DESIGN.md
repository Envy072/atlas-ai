# Atlas AI — Milestone 21 Design Specification

**Market Intelligence Surfacing: A Second Pure Projection, Not a Second
Pattern**

Status: **Design only. No code, no folders, no source files exist yet.**

Milestone 20 established the shape this milestone follows: a new,
additive, presentational card rendering an already-validated
`DecisionProfile` field directly, with zero backend changes. This
document verifies — not assumes — that the same shape is correct here,
and is explicit everywhere the two milestones' underlying data actually
differs.

---

## Pre-Design Verification

### Re-verifying `PRODUCT_BACKLOG.md`'s ordering directly

Re-read fresh, not from memory. Priority 1's remaining items after
Milestone 20 are, in the document's own order: **Market Intelligence**,
**Financial Intelligence**, **Startup Builder**. Each was checked
directly, not assumed still-open:

- **Market Intelligence** — grep-confirmed **zero** consumers of
  `DecisionProfile.marketProfile` anywhere in `components/`, `app/`, or
  `lib/verification/`. Genuinely open.
- **Financial Intelligence** — not separately re-verified in depth this
  round (Market is being selected first, per the reasoning below); its
  own surfacing is named as the immediate next milestone (Future Growth).
- **Startup Builder** — unchanged from Milestone 20's own finding: a
  multi-stage pipeline with no existing schema anywhere, too large for a
  single milestone.

**Why Market over Financial, checked rather than assumed:**
`PRODUCT_BACKLOG.md` lists them in the order Market → Financial;
Milestone 20's own Future Growth section already named Market as the
next milestone in this sequence based on a direct schema read performed
during that investigation. This design re-verifies that reasoning
directly (below) rather than repeating it on faith.

### Full `MarketProfile` schema, read directly

`lib/market/schemas/market.schema.ts` plus every sub-schema it imports
(`sizing.schema.ts`, `segmentation.schema.ts`, `geography.schema.ts`,
`trends.schema.ts`, `regulation.schema.ts`, `risks.schema.ts`,
`enums.ts`) were read in full:

```
MarketProfile
├── id, industry, subIndustry?
├── sizing: { tam, sam, som }         — each a MarketSizeEstimate
│                                        { valueUsd?, asOfYear?, methodology?, confidence? }
├── customerSegments: CustomerSegment[]  — { name, description?, estimatedSizeUsd?, painPoints[] }
├── geographicMarkets: GeographicMarket[] — { region, country?, marketSizeUsd?, notes? }
├── growthRate?: MarketGrowthRate      — { cagrPercent?, periodYears?, methodology? }
├── marketMaturity?: MarketMaturity    — enum: emerging/growth/mature/declining
├── regulations: Regulation[]          — { name, jurisdiction?, description?, severity? }
├── risks: MarketRisk[]                — { name, description?, severity? }
├── trends: MarketTrend[]              — { name, description?, direction }
├── sources, evidence, confidence, refresh
```

### Consumer & Dependency Audit

Confirmed via grep, matching Milestones 18/19/20's own repeated finding
for their respective platforms: **zero** components anywhere render
`marketProfile`. `DecisionReport.tsx` (current, post-Milestone-20)
renders exactly `TrustPanel`, `CompetitorIntelligenceCard`,
`DecisionSummaryPanel` — no fourth child yet.

### Legacy precedent audit — a real, adjacent finding

`components/workspace/MarketCard.tsx` and
`components/workspace/report/MarketSection.tsx` (the legacy, orphaned
`AIWorkspace`/report flow) both render only freeform prose from the old
`AnalysisResult` schema — no structural precedent, exactly as Milestone
20 found for `CompetitionCard.tsx`. Frozen, not touched.

**`components/workspace/MarketChart.tsx` — a real, concerning finding,
directly relevant to this milestone's own design decisions:**

```tsx
const data = [
  { year: "2025", value: 120 },
  { year: "2026", value: 180 },
  { year: "2027", value: 260 },
  { year: "2028", value: 360 },
  { year: "2029", value: 500 },
];
```

This legacy component renders a `recharts` `AreaChart` from **entirely
hardcoded, fabricated five-year data points** — not derived from any
real analysis, not sourced, not evidenced. This is a real violation of
this project's "never fabricate" principle, but it lives in the frozen,
orphaned legacy flow (Milestone 1's still-open "unify the analyze-idea
implementation" item), so it is not this milestone's job to fix it —
**it is, however, a direct and important cautionary precedent for this
milestone's own Growth Rate design decision** (see Knowledge vs
Observation and Non-Goals below): this design must not repeat that exact
mistake under a different name.

### Schema-to-backlog gap analysis

`PRODUCT_BACKLOG.md`'s exact Market Intelligence asks, matched against
the schema read above:

| Backlog ask | Schema support |
|---|---|
| "TAM/SAM/SOM with sources" | ✅ `sizing.{tam,sam,som}`, each a full `MarketSizeEstimate`; `sources`/`evidence` at the profile level |
| "Geographic breakdown" | ✅ `geographicMarkets: GeographicMarket[]` |
| "Regulations" | ✅ `regulations: Regulation[]` |
| "Market trends supported by evidence" | ✅ `trends: MarketTrend[]` + profile-level evidence |
| "Growth charts" | ⚠️ **Partial, and only as a stat, never a chart** — `growthRate` is a single `{ cagrPercent?, periodYears? }` pair, not a time series. No real data exists to plot a curve from; charting it would require fabricating intermediate points, exactly `MarketChart.tsx`'s own mistake. Rendered as a labeled stat ("18% CAGR over 3 years"), not a chart. |
| "Entry barriers" | ❌ No field anywhere on `MarketProfile` represents this concept. Not conflated with `risks` (a market risk is not necessarily an entry barrier) or `regulations` (a regulation is not necessarily a barrier either, though the two often correlate in practice) |
| "Search demand" | ❌ No field anywhere — would require a real search-volume data source that does not exist in this codebase |

**Four of seven asks are well-supported; one is honestly satisfiable only
as a stat, not the chart the backlog literally asks for; two have no
schema representation at all.** Stated plainly, not glossed over — the
same discipline Milestone 20 applied to Competitor Intelligence's own
gap analysis (which found 5 of 9 asks supported).

**Additional real fields beyond the explicit backlog wording:**
`industry`/`subIndustry` (a market's classification, already
Milestone-17-resolved and accumulating) and `marketMaturity` and
`customerSegments` (with `painPoints[]`) are real, validated fields not
explicitly named by the backlog but directly relevant to "market
opportunity" — Milestone 20 similarly surfaced `CompanyProfile.description`/
`.targetMarket`/`.businessModel` even though the backlog didn't name them
individually, since they're already real, structurally available data.
The same reasoning applies here.

---

## 1. Purpose

Add a new, additive `MarketIntelligenceCard` to the live Decision
Report, rendering `DecisionProfile.marketProfile` (the real, resolved,
partially-accumulating `MarketProfile` Milestone 17 already builds) —
closing the same class of gap Milestone 20 closed for Competitor
Intelligence, using the identical architectural shape: a pure UI
projection, zero backend changes.

## 2. Product Vision

> `PRODUCT_BACKLOG.md`'s own words: *"Current market section is mostly
> text. Need TAM/SAM/SOM with sources... Geographic breakdown...
> Regulations... Market trends supported by evidence."* Every one of
> these (except a literal chart, and except two backlog items no schema
> anywhere captures) already exists as real, validated, evidence-backed
> data on `MarketProfile`. The gap is the same one Milestone 20 closed
> for competitors: computed, stored, shown to nobody.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| How big is this market — TAM/SAM/SOM? | If discovered — real `MarketSizeEstimate`s, each with its own methodology note; often value-absent in this environment, rendered honestly, not fabricated. |
| Where geographically does this market exist? | If discovered — `geographicMarkets[]`. |
| What regulations apply? | If discovered — `regulations[]`, each with a jurisdiction and severity when known. |
| Is this market growing? | As a real stat (CAGR + period), when known — **never as a fabricated chart**. |
| What are the real market trends, and what's the evidence? | If discovered — `trends[]`, backed by the profile's own evidence. |
| What's the addressable customer segmentation? | If discovered — `customerSegments[]`, with real pain points. |
| What are the entry barriers? Is there real search demand? | **No** — no field captures either; honestly out of scope (Non-Goals). |

## Architectural Discovery

This is the **second UI-layer milestone** in this sequence, following
the exact precedent Milestone 20 established for the first
(`CompetitorIntelligenceCard`). Per `CLAUDE.md`'s layering rules, the
correct home remains `components/workspace/decision-report/` — never
`lib/market/` or `lib/decision/`, both of which already fully expose
`marketProfile` on every `DecisionProfile` since Milestone 17. This
milestone adds a reader, not a producer.

**A genuinely different rendering shape from Milestone 20's, verified
directly rather than assumed identical:** `keyCompetitors` was an array
of *independent* records (each company its own bounded unit).
`marketProfile` is a **single object** with **several independent
list-shaped facets** (`geographicMarkets[]`, `regulations[]`, `trends[]`,
`customerSegments[]`) plus **several independent scalar/singular facets**
(`sizing`, `growthRate`, `marketMaturity`) — closer in shape to
`FinancialProfile`'s or `BusinessProfile`'s "one object, many facets"
structure (Milestones 18/19's backend work) than to Milestone 20's "list
of N similar records." The UI consequence: this card is organized as
**several distinct facet sections within one card** (sizing stats,
geography list, regulation list, trend list, segment list), not a
repeated per-item sub-card the way `CompetitorIntelligenceCard` is.

## Knowledge vs Observation

Not a backend-accumulation question this time (no schema/merge logic is
touched), but it resurfaces here in a genuinely new, UI-specific form
this milestone must resolve honestly: **which of `MarketProfile`'s
facets can be rendered as a static snapshot, and which would misrepresent
themselves if rendered as something implying a trend over time?**

- **Safe to render as a snapshot stat:** `sizing` (TAM/SAM/SOM — each a
  single point-in-time estimate, already labeled with `asOfYear` when
  known), `growthRate` (a single CAGR figure — a *rate*, not a series),
  `marketMaturity` (a single classification).
- **Not safe to render as a time-series chart:** anything implying
  "value over time" — because no field on `MarketProfile` is a time
  series. This directly extends Milestone 17's own frozen finding
  (`MergeMarketProfileInput` excludes `sizing`/`growthRate`/
  `marketMaturity` from merging *because* they're point-in-time
  observations, not accumulating knowledge) into a UI consequence never
  previously stated: **a point-in-time observation cannot be honestly
  charted as a trend either**, for the same underlying reason it can't
  be merged as one — there is only ever one real data point per field,
  never a series. Rendering `growthRate.cagrPercent` as a chart (the
  legacy `MarketChart.tsx`'s own mistake) would visually imply a
  multi-year trajectory that was never actually measured.

## Identity Model

Not applicable — no new identity or accumulation concept introduced.
`MarketProfile.id` (Milestone 17's own resolved identity) is unchanged;
this card only reads it.

## Discovery / Evidence / Confidence Strategy

**Discovery:** not applicable — `discoverMarket()`/`resolveMarketKnowledge()`
entirely unchanged.

**Evidence:** the profile-level `sources`/`evidence` already feed
`VerificationSummary`'s aggregation (Milestone 17, unchanged). This card
is a second, additive *view* of a subset of that same evidence at the
market-facet level of detail `VerificationSummary`'s own flattened view
doesn't preserve — the identical "one source, two projections" shape
Milestones 19/20 already established. `trends[]` in particular should
visibly connect to the profile's evidence, mirroring how
`CompetitorIntelligenceCard` paired each company's evidence with its own
claims.

**Confidence:** `marketProfile.confidence` renders as a stat, direct
passthrough, exactly as `CompetitorIntelligenceCard` already does for
each company's own `confidence`.

## Decision / Verification / Pipeline Relationship

**No `lib/decision/`, `lib/market/`, `lib/verification/`, or
`lib/pipeline/` change of any kind.** `DecisionProfile.marketProfile`
already exists (Milestone 17); this milestone adds a consumer only.
`VerificationSummary`'s evidence aggregation already includes
`marketProfile.sources`/`.evidence` (Milestone 17, unchanged) — this
card doesn't duplicate that aggregation, only presents a subset of the
same evidence at a different level of detail (Evidence Strategy, above).

## Canonical Decision Report Ordering — a product architecture decision,
not an implementation accident

**Re-evaluated from first principles, per explicit design review.** The
order `DecisionReport` renders its children in was, until this revision,
an artifact of *build sequence* (Milestone 20 built Competitor first,
this milestone builds Market second) rather than a deliberate claim about
how a founder or investor should read the analysis. That is a real gap
in this design as originally written — Data Flow stated an order as a
fact, without justifying it as one.

**The canonical order, going forward, for every current and future
Decision Report card:**

```
1. TrustPanel                        — can I trust what follows?
2. MarketIntelligenceCard            — is there a real opportunity here?
3. CompetitorIntelligenceCard        — who else is already pursuing it?
4. BusinessIntelligenceCard (future) — given 2+3, what's the business model/moat/GTM?
5. FinancialIntelligenceCard (future)— does that business model actually work financially?
6. DecisionSummaryPanel              — Atlas AI's synthesized judgment, given everything above
```

**Why this order, not the reverse or any other permutation:**

- **Trust first** is unchanged, established reasoning (Milestone
  14/15) — an epistemic frame has to precede any specific claim.
- **Market before Competitor** — a genuinely principled, not arbitrary,
  choice: competitive intelligence is only interpretable in light of
  market context. "Five competitors" means something completely
  different in a $50M SAM than in a $50B SAM; showing competitors before
  the reader knows the market's size and shape asks them to judge
  differentiation with no scale to judge it against. This also matches
  standard investment-memo/pitch-deck convention (Market Opportunity
  before Competitive Landscape) — a direct fit for a product whose own
  stated identity is "the way an investment committee would" evaluate an
  idea (`CLAUDE.md` Section 1).
- **Competitor before Business** — a business model's differentiation
  and moat can only be meaningfully judged once the reader already knows
  who else occupies the space; positioning claims read as unfounded
  without the competitive context immediately before them.
- **Business before Financial** — unit economics and financial viability
  are downstream of the business model and go-to-market strategy that
  produce them; showing financials before the business model that
  explains them inverts cause and effect.
- **Decision Summary last, unchanged** — Atlas AI's own synthesized
  material (investment thesis, SWOT, findings, critical risks) is a
  conclusion drawn *from* everything above it; evidence-before-conclusion
  is this project's standing principle (`CLAUDE.md`: "Evidence precedes
  conclusions"), not a new rule invented for this milestone.

**This ordering is now binding, not merely a suggestion for this
milestone.** Any future milestone introducing `BusinessIntelligenceCard`
or `FinancialIntelligenceCard` must slot into positions 4 and 5
respectively — their own design documents should reference this section
rather than re-litigating the ordering question from scratch.

### Verified: no conflict with any current or future milestone

- **Milestone 20's `CompetitorIntelligenceCard`** moves from position 2
  to position 3. This is a small, in-scope reordering of JSX already
  inside `DecisionReport.tsx` — a file this milestone already edits to
  insert `MarketIntelligenceCard` — not a new file touched, not a
  violation of "don't disturb working code beyond what's requested"
  (Section 25/Definition of Done, updated below).
- **Grep-confirmed:** no component in `components/workspace/decision-report/`
  depends on a sibling's position or reads any shared/ordered state —
  each is an independent, prop-driven, side-effect-free component
  stacked in a `space-y-8` column. Reordering is a pure JSX-order change
  with zero data-flow risk.
- **`DecisionSummaryPanel`'s own `businessSummary` field** is unaffected
  — a future `BusinessIntelligenceCard` appearing at position 4 does not
  conflict with `businessSummary` still appearing inside
  `DecisionSummaryPanel` at position 6; this is the identical "one
  source, two projections" shape Milestone 19 already established as
  architecturally acceptable (`businessSummary` and a full
  `businessProfile` object coexisting without being competing sources of
  truth).
- **No Verification/Pipeline/Decision-layer dependency exists on Dashboard
  rendering order** — ordering is exclusively a `components/` concern,
  confirmed by this project's own layering rules (`CLAUDE.md` Section
  3); no backend file is affected by this decision.

## Data Flow

```
DecisionReport({ profile, verification })
  │
  ├─ TrustPanel({ verification })                                       UNCHANGED
  ├─ MarketIntelligenceCard({ market: profile.marketProfile })           NEW — position 2
  ├─ CompetitorIntelligenceCard({ competitors: profile.keyCompetitors }) MOVED — position 2 → 3 (Milestone 20 code, reordered)
  └─ DecisionSummaryPanel({ profile })                                  UNCHANGED — position 6 (of the eventual full 6)
```

`profile.marketProfile` (present on every `DecisionProfile` since
Milestone 17 — always a real object, never undefined, even for an
"unclassified" industry) is passed straight through — no new prop
threading, no new fetch, no new hook, no mapping function between
`profile.marketProfile` and the component's prop.

## Why no ViewModel, DTO, mapper, or duplicate representation

The component's prop is `market: MarketProfile` — the exact type
Milestone 17 established (`z.infer<typeof MarketProfileSchema>` from
`lib/market`'s public barrel), the same type
`DecisionProfileSchema.marketProfile: MarketProfileSchema` already uses.
No interface redeclares any of `sizing`/`geographicMarkets`/`regulations`/
`trends`/`customerSegments`'s fields under a new name; every JSX
expression reads a field directly off the `MarketProfile` instance
passed in (`market.sizing.tam.valueUsd`, `market.geographicMarkets`,
etc.) — the identical proof structure already established for
`CompetitorIntelligenceCard` in Milestone 20's own design review. The
only transformation applied anywhere is display formatting (`formatPercent`
for `confidence`, a currency formatter for `valueUsd`-style numbers,
reused from or added alongside `lib/format.ts`'s existing pure
formatting functions) — the same category of change Milestone 20's
design review already distinguished from a structural duplication.

## Why no changes are required in `lib/market`

`MarketProfileSchema` already contains every field this card renders;
`resolveMarketKnowledge()`/`discoverMarket()` already produce a complete,
schema-valid `MarketProfile` on every `DecisionProfile`. This milestone's
entire task is adding a reader in `components/`, exactly mirroring why
Milestone 20 required zero changes in `lib/competitors`.

## Why `MarketProfile` remains the single source of truth

`lib/market/schemas/market.schema.ts` remains the **one** place this
shape is defined. The card neither recomputes a value the schema doesn't
already carry (no derived TAM-from-SAM math, no invented growth curve)
nor introduces a second definition of any field — it is a read-only
window onto data Milestone 17 already validated and Milestone 19's own
`DecisionProfile.businessProfile` precedent already established as
architecturally acceptable (a full-object field with real internal
structure, exposed once, read many times).

## Risks

- **The empty/absent case is the realistic default in this
  environment** — most `MarketSizeEstimate`/`growthRate`/`marketMaturity`
  fields will be absent (no real market-data source configured);
  `regulations`/`trends`/`geographicMarkets`/`customerSegments` will
  often be empty arrays. Every one of these must render an honest
  "not yet known" state — never a placeholder number, never a hidden
  section masquerading as "nothing to show" when the real state is
  "not yet discovered."
- **A reader might expect a real growth chart**, since the backlog
  literally says "Growth charts." Mitigated by Knowledge vs Observation's
  direct, evidenced explanation of why that specific ask cannot be
  honestly satisfied with the data that exists — and by the cautionary
  precedent `MarketChart.tsx` itself already provides of what fabricating
  one looks like.
- **Layout risk:** a single object with five-plus independent facets
  (unlike Competitor's repeated-record shape) risks becoming one very
  long card. The actual section layout (grouped stat rows for
  sizing/growth/maturity, then list sections for geography/regulations/
  trends/segments) is a real UI decision to finalize against actual
  rendered output during implementation, not decided speculatively here
  beyond "grouped facet sections, not one flat list."

## Design Deviations

None found during this investigation. `MarketChart.tsx`'s fabricated
data (Pre-Design Verification) is a real deviation from this project's
principles, but it lives in frozen, orphaned legacy code this milestone
does not touch — recorded as Design Debt (below), not folded into this
milestone's own Definition of Done, the same reasoning Milestone 20
applied to its own out-of-scope findings.

## Non-Goals

- Does not render `keyCompetitors` (Milestone 20, done),
  `financialProfile`, or `businessProfile` — Financial Intelligence
  surfacing is the immediate next milestone (Future Growth).
- Does not add "entry barriers" or "search demand" fields to
  `MarketProfileSchema` or any other `lib/market/` file — no schema
  representation exists, and none is fabricated to fill the gap.
- Does not render a growth chart of any kind — only a real, single-point
  CAGR stat, per Knowledge vs Observation's direct reasoning.
- Does not modify `lib/market/`, `lib/decision/`, `lib/verification/`,
  or `lib/pipeline/` in any way.
- Does not touch the legacy `AIWorkspace`/`MarketCard.tsx`/
  `MarketChart.tsx`/`MarketSection.tsx` flow — frozen, orphaned, a
  separate concern (Milestone 1's still-open item).
- Does not redesign `TrustPanel.tsx`, `CompetitorIntelligenceCard.tsx`,
  or `DecisionSummaryPanel.tsx` — additive only.
- Does not introduce any new shared primitive unless a genuine
  third-repetition pattern emerges across this and the next two
  Intelligence-surfacing milestones (Complexity Review).

## Complexity Review

- **Whether any part of `growthRate`/`sizing` should be rendered as a
  chart (via the already-installed `recharts` dependency, confirmed
  present via `MarketChart.tsx`'s own import) was directly challenged
  and rejected** — a chart implies a data series; none exists. Using an
  available charting library is not, by itself, justification for
  producing one when the underlying data doesn't support it honestly.
- **Whether to introduce a new shared "facet section" primitive now, in
  anticipation of Financial/Business's own upcoming cards, was directly
  challenged and rejected** — the same "don't design for hypothetical
  future requirements" reasoning Milestone 20 already applied to its own
  equivalent question. Revisit at the third repetition (Milestone 22 or
  23), not before.
- **Whether to conflate "entry barriers" with `risks`/`regulations` to
  produce partial backlog coverage was directly challenged and
  rejected** — a market risk or a regulation is not the same claim as an
  entry barrier, and rendering one under the other's label would
  misrepresent what was actually found.

## Performance Review

- **Computational hotspots:** none — rendering a single, already-fetched
  object with several small lists; no new computation, no new request.
- **Memoization:** none added by default, consistent with `CLAUDE.md`'s
  "memoize with a reason" rule and Milestone 20's own precedent.
- **Scaling risk:** none identified — `MarketProfile`'s own lists
  (`geographicMarkets`, `regulations`, `trends`, `customerSegments`) are
  realistically small.

## Deterministic Reasoning

Trivially satisfied — pure presentation over already-validated,
deterministic data, identical in kind to Milestone 20's own conclusion.
No LLM involvement is introduced or appropriate here.

## Design Debt

1. **`MarketChart.tsx`'s fabricated fixture data** (Pre-Design
   Verification) remains unfixed — real, pre-existing, out of scope
   (frozen legacy flow), named here for the record.
2. **Financial and Business Intelligence remain unsurfaced** — named,
   immediate next milestones, not a surprise gap.
3. **"Entry barriers" and "search demand" have no schema representation
   anywhere** — a real, larger, future `lib/market/` gap (would need its
   own knowledge-platform-style extension, e.g., a real search-demand
   data source), not something a UI-only milestone can close.

## Product Readiness

Honest assessment: this milestone closes real ground on
`PRODUCT_BACKLOG.md`'s Market Intelligence Priority 1 item — TAM/SAM/SOM,
geography, regulations, and evidence-linked trends become genuinely
visible for the first time. It does not close the item fully — no
growth chart is produced (a deliberate, justified honesty choice, not an
oversight), and entry barriers/search demand remain entirely
unaddressed since no data exists for either.

## Future Growth

- **Business Intelligence surfacing** — slots into **position 4** of the
  Canonical Decision Report Ordering, immediately after
  `CompetitorIntelligenceCard`; `BusinessProfile`'s Milestone-19 fields
  round out the same card family, though `PRODUCT_BACKLOG.md` doesn't
  name it directly. Its own design should reference the Canonical
  Decision Report Ordering section above rather than re-deciding
  placement.
- **Financial Intelligence surfacing** — slots into **position 5**,
  immediately before `DecisionSummaryPanel`; `FinancialProfile`'s
  methodology-note-per-estimate shape (Milestone 18) directly answers
  "CAC/LTV explanation" and "sources for every financial estimate."
  Same instruction: reference the canonical ordering, don't re-decide it.
- **If a real search-demand or entry-barrier data source is ever added**
  (Design Debt #3), this card (and `MarketProfileSchema`) would need a
  genuine backend extension first — not fabricated in the UI now.
- **If a real historical/projected time-series field is ever added to
  `MarketProfile`** (a genuinely new schema capability, not this
  milestone's job), a real growth chart becomes honestly renderable —
  until then, a stat is the correct, honest ceiling.

## Definition of Done

1. New file `components/workspace/decision-report/MarketIntelligenceCard.tsx`
   — a single-responsibility presentational component taking
   `market: MarketProfile` and rendering: industry/subIndustry and
   maturity as a header context, sizing (TAM/SAM/SOM) as stats with
   methodology notes when present, a growth-rate stat (never a chart),
   geographic markets as a list, regulations as a list (with severity),
   trends as a list (with direction and evidence), customer segments as
   a list (with pain points) — every absent/empty field rendering an
   honest "not yet known"/empty state, nothing fabricated.
2. `DecisionReport.tsx` renders `<MarketIntelligenceCard market={profile.marketProfile} />`
   as a new child positioned **second**, immediately after `TrustPanel`
   — per the Canonical Decision Report Ordering decided above.
   `CompetitorIntelligenceCard`'s existing JSX line moves to **third**
   position in the same file (a reordering, not a rewrite — its own
   props and implementation are untouched). `TrustPanel` and
   `DecisionSummaryPanel`'s own implementations remain untouched.
3. Reuses only existing shared/ui primitives (`Card`, `SectionHeader`,
   `IconBadge`, `Badge`, `EmptyState`) plus `lib/format.ts`'s existing
   (or minimally extended) pure formatting helpers — no chart library
   import, no new shared primitive (Complexity Review).
4. Zero changes anywhere under `lib/`.
5. Manually verified against the running dev server for both the
   honestly-empty path (realistic in this environment) and a populated
   fixture path (via a temporary scratch page, deleted before final
   build), following the exact Client-boundary precedent Milestones 15
   and 20 already established.
6. `tsc --noEmit`, `eslint`, `next build` all clean.
7. `git status --short` touches only the one new component file and the
   small addition to `DecisionReport.tsx`.
8. Nothing committed until explicitly requested.

---

*End of design specification. Awaiting review before any implementation
begins.*
