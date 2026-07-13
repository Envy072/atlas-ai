# Atlas AI — Milestone 24 Design Specification

**Decision Report Architecture Cleanup: Extracting What's Actually Repeated**

Status: **Design only. No code, no folders, no source files exist yet.**

This is the first non-additive milestone in the Milestones 20–24
sequence. It adds no user-facing capability and changes no runtime
output — its entire purpose is to reduce duplication across the six
components that make up the Decision Report
(`TrustPanel`, `MarketIntelligenceCard`, `CompetitorIntelligenceCard`,
`BusinessIntelligenceCard`, `FinancialIntelligenceCard`,
`DecisionSummaryPanel`), now that all four Intelligence cards exist and
the complete pattern is visible.

---

## Pre-Design Verification

### Git state re-verified

`git log`/`git status` confirm Milestone 23 is committed and pushed
(`123b9be`), working tree clean.

### Direct, line-by-line audit of all six components

Every component was read in full this session — not recalled from
memory of writing them. Findings below quote exact code, not
paraphrases, so repetition claims are verifiable rather than assumed.

#### 1. Stat cell (label / value / optional caption)

Confirmed **byte-identical** in its most common sub-shape — the
"Confidence" stat in each card's header — across **four** files:

```tsx
// MarketIntelligenceCard.tsx (102-105), CompetitorIntelligenceCard.tsx (62-65),
// BusinessIntelligenceCard.tsx (93-96), FinancialIntelligenceCard.tsx (99-102)
<div className="text-right">
  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Confidence</p>
  <p className="mt-1 text-xl font-bold text-foreground">{formatPercent(Math.round(X.confidence))}</p>
</div>
```

identical in every character except the source variable (`market.`,
`competitor.`, `business.`, `financial.`). Beyond this exact
sub-pattern, three richer variants of the same shape exist:

- `TrustPanel.ConfidenceStat` (lines 15–22) — label + value only, used
  4× within `TrustPanel` itself, **`text-2xl`, not `text-xl`** — a
  real, pre-existing size difference from every other card's stat text.
- `MarketIntelligenceCard.SizeStat` (53–66) — label + value + up to
  **two** conditional captions (`asOfYear`, `methodology`), used 3×
  (TAM/SAM/SOM) plus a further inline Growth variant (113–121) with one
  conditional caption (`over Ny`).
- `FinancialIntelligenceCard.FinancialStat` (52–60) — label + value +
  one conditional caption (`methodology`), used 11× — the same shape as
  `SizeStat` minus the `asOfYear` line, already commented at
  Milestone 22 as "deliberately not extracted... postponed until after
  Milestone 23."
- `BusinessIntelligenceCard`'s four inline stat blocks (104–136) —
  Overall health, Economic moat (with **two** conditional captions:
  strength score, then rationale), Execution complexity, Competitive
  position — none extracted to a local function at all, the least
  consolidated of the four cards.

**Total confirmed occurrences of this shape: at least 12** across six
files (4 identical confidence stats + `ConfidenceStat`'s 4 internal uses
+ `SizeStat`'s 3 + `FinancialStat`'s 11, undercounting since
`FinancialStat`'s 11 uses are one function, not 11 separate
duplications — the *distinct implementation sites* are 6: `ConfidenceStat`,
`SizeStat`, the inline Growth stat, `FinancialStat`, Business's four
inline blocks, and the four repeated inline Confidence blocks).

#### 2. Evidence-list-with-source-link

Confirmed **byte-identical** across **four** standalone "Evidence"
sections:

```tsx
// MarketIntelligenceCard.tsx (226-239), CompetitorIntelligenceCard.tsx (137-150),
// BusinessIntelligenceCard.tsx (243-256), FinancialIntelligenceCard.tsx (191-204)
{hasEvidence && (
  <div>
    <h3 className="mb-2 text-sm font-semibold text-foreground">Evidence</h3>
    <ul className="space-y-1 border-l border-border pl-3">
      {X.evidence.map((evidence) => (
        <li key={evidence.id} className="text-xs text-muted-foreground">
          {evidence.evidence}{" "}
          <a href={evidence.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            (source)
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

**`TrustPanel`'s own evidence-list usage is structurally different, not
identical** — confirmed by direct comparison: it's nested one level
deeper inside each verified claim's own `<li>`, wrapped in
`<ul className="ml-4 space-y-1 border-l border-border pl-3">` (note the
extra `ml-4` class not present anywhere else), and has no standalone
"Evidence" `<h3>` heading of its own. This is a real, precise
distinction this review makes rather than glossing over: four sites are
one shape, `TrustPanel`'s is a related-but-different fifth shape.

#### 3. Severity → badge-tone mapping

Confirmed **byte-identical** `Record` in **three** files:

```tsx
// MarketIntelligenceCard.tsx (35-39), FinancialIntelligenceCard.tsx (14-18),
// BusinessIntelligenceCard.tsx (42-46)
const SEVERITY_TONE: Record<Severity, "secondary" | "warning" | "destructive"> = {
  low: "secondary",
  medium: "warning",
  high: "destructive",
};
```

`DecisionSummaryPanel.severityBadgeVariant` (lines 18–22) is **not**
a fourth copy of this — confirmed by direct comparison, it is a
differently-shaped function handling a **superset** scale (`Finding`'s
3-level `Severity` *and* `RiskFinding`'s 4-level `RedFlagSeverity`,
predating every Intelligence card, from Milestone 15):

```tsx
function severityBadgeVariant(severity: string): "destructive" | "warning" | "secondary" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "warning";
  return "secondary";
}
```

The correct shared target is this function's own shape (already
handles both scales safely), not the narrower 3-entry `Record` — see
Complexity Review.

#### 4. Tag/badge list (flex-wrap `Badge` list from a plain label set)

**`BusinessIntelligenceCard` already independently built the correct
shared shape as a local component:**

```tsx
// BusinessIntelligenceCard.tsx (48-58)
function StringBadgeList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <Badge key={index} variant="outline">{item}</Badge>
      ))}
    </div>
  );
}
```

used 4× within that file (`distributionChannels`, `growthDrivers`,
`expansionOpportunities`, `competitiveAdvantages`). The same
`<div className="flex flex-wrap gap-2">{items.map(...badge...)}</div>`
shape (each item's label pre-formatted to a plain string before being
handed to the badge) appears inline, not yet extracted, in:
`CompetitorIntelligenceCard`'s `features` list (102–108),
`MarketIntelligenceCard`'s `geographicMarkets` list (156–162, each
`Badge`'s content built from `region`/`country`/`marketSizeUsd`),
`FinancialIntelligenceCard`'s `revenueStreams`/`expenses` lists
(150–157, 164–170). **Confirmed 4 distinct implementation sites beyond
the one already-correct local component**, each needing only a
pre-formatted `string[]` to match `StringBadgeList`'s existing shape
exactly — no generic "item renderer" prop is needed, since every site
already reduces its structured data to a label string before rendering.

Pricing tiers (`CompetitorIntelligenceCard`, 87–94) are a near-miss:
same wrapper shape, `Badge variant="secondary"` instead of `"outline"` —
a real, minor styling difference to preserve, not unify silently (see
Design Deviations).

#### 5. Plain bulleted string list with an empty-state fallback

**A confirmed, pre-existing inconsistency, not introduced by this
review:**

```tsx
// DecisionSummaryPanel.tsx (24-35) — StringList, takes {items, empty}
<ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">

// CompetitorIntelligenceCard.tsx (21-29) — StringList, takes {items} only
// (caller handles the empty case itself, inline)
<ul className="list-disc space-y-1 pl-5 text-sm text-foreground">

// FinancialIntelligenceCard.tsx (139) — inline, not extracted to a function
<ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
```

`space-y-1.5` in `DecisionSummaryPanel` vs. `space-y-1` in
`CompetitorIntelligenceCard`/`FinancialIntelligenceCard` — a real,
verified byte-level difference between two already-shipped components.
This matters directly for this milestone's "no visual redesign"
constraint: naively unifying these three into one shared component
would silently change one or two files' actual rendered spacing. See
Design Deviations and Definition of Done.

#### 6. Already correctly shared — confirmed, not re-recommended

`SectionHeader` and `IconBadge` (`components/shared/`) are used
identically and correctly by all six components with zero local
duplication of their own logic. `EmptyState` (`components/shared/`) is
used correctly by `CompetitorIntelligenceCard`, the only card that can
render a fully-empty state (every other card always has header-level
context — industry, revenue model, business model — even when every
stat is absent, confirmed by re-reading each card's own header logic).
**No action needed on any of these three** — they were correctly
extracted before this milestone sequence began, and this audit confirms
that remains true.

#### 7. Domain-specific label maps — checked, confirmed not duplicates

`MATURITY_LABEL` (Market), `CATEGORY_LABEL` (Competitor), `HEALTH_LABEL`/
`MOAT_LABEL`/`COMPLEXITY_LABEL` (Business) each map a *different* enum
(`MarketMaturity`, `CompetitorCategory`, `BusinessHealthRating`,
`MoatType`, `ExecutionComplexityLevel`) to a display label. Verified
directly: no two of these Records share a domain or a value set — they
are not duplicates of each other and are correctly local to their own
card. **Not an extraction candidate.**

### `DecisionReport.tsx` — checked, confirmed still orchestration-only

Re-read in full: zero computation, zero conditionals, zero data
transformation — six imports, direct prop pass-through to six children,
one large explanatory comment. **Confirmed correct as-is; no change
needed or proposed.**

### `lib/format.ts` — checked, confirmed still a single file

Re-read in full: 50 lines, four small pure functions
(`formatScore`, `formatPercent`, `formatCurrencyUsd`,
`formatRelativeTime`), zero side effects, zero domain-type imports.
`CLAUDE.md`'s own Folder Rule for this file — *"Split into `lib/format/`
if it grows real sub-concerns"* — is not yet triggered at four small
functions. **No split recommended.**

---

## 1. Purpose

Extract the confirmed, repeated presentation patterns above into a
small number of shared components, adopted by all six existing Decision
Report components, with **zero change to rendered output**. This is
maintenance investment, not a capability — the same honest framing
Milestone 20 gave its own postponed `lib/shared/` proposal, now actually
executed at the point Milestone 22 said to wait for.

## 2. Product Vision

> Six components now independently reimplement the same handful of
> visual shapes — a stat cell, an evidence list, a severity badge, a tag
> list. Each was correct and justified to write locally at the time
> (Milestones 20–23 each correctly declined to extract early). Four
> cards later, the shape of the real, stable pattern is now fully known
> — extracting it now costs one careful refactor; leaving it any longer
> costs a fifth and sixth divergent copy the next time any of these
> cards needs a change.

## 3. User Questions

**None — by design.** This milestone answers zero new user-facing
questions and must produce zero observable difference. See Definition
of Done.

## Architectural Discovery

This is the first **refactor-only** milestone in the sequence — every
prior milestone (13–23) either built new backend knowledge, wired an
existing platform into `DecisionProfile`, or added a new UI projection.
This one touches only already-shipped, already-verified presentational
code, with the explicit constraint that its own correctness is measured
by *absence* of change, not presence of a new capability.

## Knowledge vs Observation

**Not applicable.** No knowledge-platform schema, accumulation, or
observation semantics are touched by this milestone — it is entirely
`components/` presentation-layer restructuring.

## Which shared components are justified, and why now

For each, per the instruction: why it wasn't extracted earlier, why it
qualifies now, and what it would cost to maintain if left alone.

### `StatCell` — recommend extraction

- **Appears repeatedly:** confirmed 12+ occurrences across 6
  distinct implementation sites (Pre-Design Verification).
- **Stable semantics:** every instance is "a label, a value, zero to
  two optional captions" — no instance needs anything structurally
  different.
- **Reduces maintenance cost:** a future styling change to any stat
  (e.g., adjusting the caption's color) currently requires editing up
  to 6 files; with extraction, 1.
- **Does not increase abstraction complexity:** the props surface
  (`label`, `value`, `captions?: string[]`, `size?: "md" | "lg"`) covers
  every real variant found — no speculative prop for a shape that
  doesn't exist today.
- **Why earlier milestones correctly postponed this:** at Milestone 22,
  only 3 occurrences of one variant were known (`ConfidenceStat`,
  `SizeStat`, `FinancialStat`) — a real but thinner case than the
  now-confirmed 12+ across every card including the never-consolidated
  `BusinessIntelligenceCard` blocks. Milestone 22's own postponement
  condition ("once Competitor/Market/Financial/Business Intelligence
  cards can all be evaluated together") is the condition this milestone
  satisfies.
- **A real preservation requirement, not a redesign opportunity:**
  `TrustPanel.ConfidenceStat`'s `text-2xl` vs. every other card's
  `text-xl` is a genuine, pre-existing inconsistency. The shared
  `StatCell` must support both via an explicit `size` prop
  (`"lg"` → `text-2xl`, default `"md"` → `text-xl`) — retrofitting
  `TrustPanel` to `size="lg"` and every other card to the default,
  preserving each file's exact current rendered size. **Silently
  unifying these two sizes would be a visual redesign this milestone
  explicitly forbids**, even though it would look like a natural
  cleanup — flagged here so implementation doesn't do it by habit.

### `EvidenceList` — recommend extraction (standalone case only)

- **Appears repeatedly:** confirmed byte-identical across 4 standalone
  "Evidence" sections (Market, Competitor, Business, Financial).
- **Stable semantics:** "a list of `{id, evidence, url}` items, each
  rendered as text plus a `(source)` link" — unchanged across all 4
  sites.
- **Reduces maintenance cost:** the `(source)` link styling, hover
  state, or wrapper spacing currently needs 4 edits; with extraction, 1.
- **Does not increase complexity:** takes `evidence: Evidence[]` and an
  optional `heading` string (defaulting to `"Evidence"`) — nothing
  speculative.
- **Why earlier milestones correctly postponed this:** each card's own
  design review (Milestones 20–22) found this duplication but had no
  mandate to extract mid-sequence; Milestone 22 explicitly deferred all
  such extraction to this point.
- **Scope boundary, stated precisely:** `TrustPanel`'s own nested,
  per-claim evidence list is **not** forced into this same component —
  confirmed structurally different (nested inside a claim `<li>`, extra
  `ml-4` wrapper, no standalone heading). Forcing it into `EvidenceList`
  would require either a generic "wrapper override" prop (unjustified
  complexity for a single caller) or silently dropping the `ml-4`
  (a visual change). **Recommendation: leave `TrustPanel`'s nested usage
  as local, inline code** — a correct, bounded non-extraction, not an
  oversight.

### Shared severity-tone mapping — recommend extraction, as a plain
utility, not a component

- **Appears repeatedly:** confirmed byte-identical 3-entry `Record` in
  3 files (Market, Financial, Business).
- **Stable semantics:** `low`/`medium`/`high` → badge tone, unchanged
  everywhere it appears.
- **Reduces maintenance cost:** a future badge-tone palette change
  needs 3 edits today; 1 after extraction.
- **Does not increase complexity:** the correct target shape is
  **`DecisionSummaryPanel.severityBadgeVariant`'s own function**,
  already handling the superset case (3-level `Severity` and 4-level
  `RedFlagSeverity`) safely via string comparison rather than a `Record`
  keyed to one specific enum type — reusing an existing, already-correct
  implementation, not inventing a new one.
- **Why earlier milestones correctly postponed this:** `severityBadgeVariant`
  predates the Intelligence-card sequence entirely (Milestone 15); each
  of Market/Financial/Business independently reimplemented a narrower
  version because extracting mid-sequence, before the full pattern was
  known, would have been premature per Milestones 20–22's own
  discipline.
- **Home:** a plain `.ts` utility in `components/shared/` (e.g.
  `components/shared/severityTone.ts`), not `lib/format.ts` — this is a
  presentation concern (badge variant selection), not a generic,
  domain-agnostic formatting function, and `lib/format.ts` currently
  imports no domain types; keeping it there avoids introducing one.

### `TagList` — recommend extraction, matching `StringBadgeList`'s
already-correct shape

- **Appears repeatedly:** `BusinessIntelligenceCard`'s own
  `StringBadgeList` (used 4×) plus 4 further un-extracted inline sites
  (Competitor's `features`, Market's `geographicMarkets`, Financial's
  `revenueStreams`/`expenses`).
- **Stable semantics:** every site already reduces its data to a plain
  `string[]` before rendering — the shared component takes exactly that,
  nothing more.
- **Reduces maintenance cost:** badge-list spacing/wrapping currently
  needs up to 5 edits; 1 after extraction.
- **Does not increase complexity:** no generic "item renderer" prop is
  introduced — every call site already does its own field-specific
  string formatting first, matching `StringBadgeList`'s existing,
  already-correct design.
- **Why earlier milestones correctly postponed this:** the pattern
  existed at 2–3 occurrences at each prior milestone's own review point
  — real, but not yet at a confirmed, complete-pattern threshold until
  this review.
- **A real preservation requirement:** Competitor's pricing-tier badges
  use `variant="secondary"`, not `"outline"` like every other tag list —
  the shared `TagList` needs a `variant` prop (default `"outline"`) to
  preserve this exact, pre-existing distinction, not silently normalize
  it away.

### `StringList` (plain bulleted list) — recommend extraction, with an
explicit spacing-preservation requirement

- **Appears repeatedly:** `DecisionSummaryPanel.StringList` (2 uses
  internally... actually 8, across strengths/weaknesses/opportunities/
  threats/positiveArguments/negativeArguments/unknowns/contradictions),
  `CompetitorIntelligenceCard.StringList` (2 uses), plus
  `FinancialIntelligenceCard`'s inline, un-extracted equivalent (1 use).
- **A confirmed, real inconsistency, not hypothetical:**
  `space-y-1.5` (`DecisionSummaryPanel`) vs. `space-y-1`
  (`CompetitorIntelligenceCard`, `FinancialIntelligenceCard`) — verified
  by direct byte comparison (Pre-Design Verification).
- **Recommendation: extract, but the shared component must accept the
  list spacing as an explicit, preserved-per-call-site detail** (e.g. a
  `dense?: boolean` prop, or simply keeping both values reachable) —
  **not** silently converged to one value, which would be a real, if
  minor, visual change to whichever file doesn't already use the
  winning value. Implementation must verify, file by file, which
  spacing each call site currently renders and pass the equivalent prop,
  not assume a single default is safe.
- **Why earlier milestones correctly postponed this:** each card wrote
  its own version independently, at a point where cross-card
  consistency wasn't yet this milestone's job.

### `ConfidenceBlock` — considered and rejected as a separate primitive

The user-supplied candidate list names `ConfidenceBlock` alongside
`StatCell`. Considered directly: the "Confidence" stat is not
structurally distinct from any other `StatCell` instance — it is simply
`StatCell` called with `label="Confidence"` and a `formatPercent`-formatted
value. Introducing a second, narrower primitive for what is already
covered by `StatCell` would be exactly the redundant-abstraction problem
this review is meant to prevent, not solve. **Not recommended as a
separate component.**

## Whether `lib/format.ts` should remain a single file

**Yes, unchanged.** Confirmed at 50 lines / 4 functions
(Pre-Design Verification) — well short of `CLAUDE.md`'s own stated
threshold ("real sub-concerns") for splitting into `lib/format/`. No new
formatting function is proposed by this milestone either:
`formatEstimateValue` (already local to `FinancialIntelligenceCard`,
unchanged since Milestone 22) correctly stays there, since it depends on
`FinancialUnit`, a `lib/financial`-defined type — moving it into the
deliberately domain-agnostic `lib/format.ts` would introduce the exact
cross-platform dependency that file has never had.

## Whether any duplicated *rendering helper functions* (not just JSX
shapes) now exist

Checked directly: `formatPercent`/`formatCurrencyUsd` are correctly
reused from `lib/format.ts` everywhere, no duplication. The five domain
label `Record`s (`MATURITY_LABEL`, `CATEGORY_LABEL`, `HEALTH_LABEL`,
`MOAT_LABEL`, `COMPLEXITY_LABEL`) are each genuinely distinct, not
duplicates (Pre-Design Verification #7). `formatEstimateValue`
(Financial-only) has no counterpart elsewhere. **No further duplicated
helper functions found beyond the five patterns already addressed
above.**

## Whether `DecisionReport.tsx` should remain orchestration-only

**Yes — confirmed correct as-is (Pre-Design Verification). No change
proposed.**

## Whether component boundaries remain correct

**Yes — confirmed.** Each of the six components takes exactly the
`DecisionProfile` field(s) it's responsible for, with no cross-card
data reads and no business logic beyond display formatting. This
milestone's extractions do not change any component's public props
contract (`market`, `competitors`, `business`, `financial`, `profile`,
`verification` — all unchanged) — only their internal implementation.

## Data Flow

Not applicable in the usual sense — no data flow changes. Instead, the
structural change this milestone makes is entirely internal to how each
component renders its already-unchanged props:

```
BEFORE:
  TrustPanel.tsx               — local ConfidenceStat (text-2xl), local nested evidence list
  MarketIntelligenceCard.tsx   — local SizeStat, local inline Growth/Confidence stats,
                                  local SEVERITY_TONE, local inline geo-badge list,
                                  local standalone evidence list
  CompetitorIntelligenceCard.tsx — local StringList, local inline Confidence stat,
                                  local inline features/pricing badge lists,
                                  local standalone evidence list
  BusinessIntelligenceCard.tsx — local StringBadgeList, local SEVERITY_TONE,
                                  4 local inline stat blocks, local inline Confidence stat,
                                  local standalone evidence list
  FinancialIntelligenceCard.tsx — local FinancialStat, local SEVERITY_TONE,
                                  local inline Confidence stat, local inline
                                  revenue/expense badge lists, local standalone evidence list
  DecisionSummaryPanel.tsx     — local StringList (space-y-1.5), local severityBadgeVariant

AFTER (proposed):
  components/shared/
    StatCell.tsx        — NEW, adopted by all 6 files' stat cells
    EvidenceList.tsx    — NEW, adopted by 4 files' standalone evidence sections
                            (TrustPanel's nested claim-evidence list stays local, by design)
    TagList.tsx          — NEW, adopted by Business/Competitor/Market/Financial's tag/badge lists
    StringList.tsx       — NEW, adopted by DecisionSummaryPanel/Competitor/Financial,
                            preserving each file's exact current spacing
    severityTone.ts      — NEW, plain utility, adopted by Market/Financial/Business
                            (generalizes DecisionSummaryPanel's own existing function;
                            DecisionSummaryPanel switches to importing it too)

  All 6 Decision Report components — retrofitted to import from the
  above instead of defining local equivalents. Every component's props
  interface, every rendered pixel, and every conditional-rendering
  branch remains identical.
```

## Why no ViewModel, DTO, mapper, or duplicate representation

Not applicable in the usual sense (no data schema is touched), but the
same discipline extends here: none of the five extractions introduces a
new data shape. `StatCell`/`EvidenceList`/`TagList`/`StringList` accept
already-formatted display values (strings, or the existing
`Evidence`/`Source` types imported from `lib/research`'s public barrel,
unchanged) — none redefines a schema type or wraps one in a new
presentation-only object. `severityTone.ts` accepts the existing
`Severity`/`RedFlagSeverity` types verbatim.

## Risks

- **The single largest risk in this milestone is regressing rendered
  output while believing nothing changed** — mitigated by the explicit
  verification method in Definition of Done (rendered-HTML comparison,
  not just visual spot-checking).
- **Two confirmed pre-existing inconsistencies (`StatCell`'s size,
  `StringList`'s spacing, `TagList`'s badge variant) could be
  "corrected" by habit during implementation.** Explicitly forbidden by
  this design — each must be preserved exactly, via a prop, not unified.
- **Retrofitting six files in one milestone is a larger diff than any
  prior milestone in this sequence** (each of Milestones 20–23 touched
  at most 2 files). Mitigated by sequencing the implementation itself
  file-by-file with a rendered-output check after each file, not as one
  atomic six-file rewrite.

## Design Deviations

Two real, pre-existing deviations were found and must be **preserved,
not fixed**, since fixing them would be a visual change this milestone's
own constraints forbid:

1. `TrustPanel.ConfidenceStat` uses `text-2xl`; every other card's
   equivalent stat uses `text-xl`.
2. `DecisionSummaryPanel.StringList` uses `space-y-1.5`;
   `CompetitorIntelligenceCard`/`FinancialIntelligenceCard`'s equivalent
   uses `space-y-1`.

A third, minor deviation (Competitor's pricing-tier badges using
`variant="secondary"` instead of every other tag list's `"outline"`)
is likewise preserved via an explicit prop, not unified.

**None of these three are fixed by this milestone.** Fixing them would
be a legitimate, separate, explicitly-scoped visual-polish milestone —
not something to bundle silently into a refactor whose entire premise is
zero observable change.

## Non-Goals

- Does not change any component's props interface.
- Does not change any rendered class name, spacing, color, or text,
  except where a shared component's prop is set specifically to
  reproduce an existing per-file difference (Design Deviations).
- Does not fix the two confirmed pre-existing visual inconsistencies —
  named, preserved, not resolved.
- Does not touch `lib/` in any way — every extraction is a
  `components/shared/` addition.
- Does not touch `DecisionReport.tsx`'s own structure (confirmed already
  orchestration-only).
- Does not add a `ConfidenceBlock` primitive (Complexity Review).
- Does not force `TrustPanel`'s nested evidence list into `EvidenceList`
  (Complexity Review).
- Does not add any new user-facing capability, chart, or data field.
- Does not modify `lib/business/`, `lib/market/`, `lib/financial/`,
  `lib/competitors/`, `lib/decision/`, or `lib/verification/`.

## Complexity Review

- **Whether all five candidates deserve extraction was directly
  evaluated, not assumed** — `ConfidenceBlock` was proposed by name and
  rejected as redundant with `StatCell`; `TrustPanel`'s nested evidence
  list was proposed implicitly (by generalizing `EvidenceList` to cover
  it) and rejected as forcing an ill-fitting abstraction onto a
  genuinely different structural context.
- **Whether five new files is itself too much surface for one
  "cleanup" milestone was considered.** Weighed against the alternative
  (leaving 12+ stat-cell sites, 4 evidence-list sites, 3 severity maps,
  and 5 tag-list sites unconsolidated indefinitely) — five small,
  single-purpose files, each solving one confirmed, stable, repeated
  pattern, is proportionate, not excessive.
- **Whether `severityTone.ts` belongs in `lib/` or `components/shared/`
  was directly evaluated** — resolved in favor of `components/shared/`
  since badge-tone selection is a presentation concern, not business
  logic, keeping `lib/` completely untouched as required.

## Performance Review

- **Computational hotspots:** none — every extraction is a
  render-time-identical refactor of already-cheap presentational code.
- **Bundle size:** negligible — five small components replace
  equivalent inline code that already shipped; no net new dependency.
- **Scaling risk:** none.

## Deterministic Reasoning

Trivially satisfied — this milestone involves no data, no reasoning, no
judgment calls about what's true, only how existing, already-correct
output is produced. No LLM involvement is introduced or appropriate.

## Design Debt

1. **The two confirmed visual inconsistencies (`StatCell` size,
   `StringList` spacing) remain unresolved after this milestone** —
   deliberately preserved, named as a real, separate future polish item
   should anyone decide to unify them (a decision requiring explicit,
   visible-change authorization this milestone doesn't have).
2. **`TrustPanel`'s nested evidence-list markup remains local, not
   shared** — a deliberate, bounded non-extraction, not an oversight.
3. **`FinancialIntelligenceCard.formatEstimateValue` remains
   Financial-specific**, correctly not generalized into `lib/format.ts`
   — unchanged, restated for completeness.

## Product Readiness

Honest assessment: this milestone produces **zero** user-observable
change. Its entire value is to the next engineer (human or AI) who
touches any Decision Report card — a stat-cell styling change, an
evidence-list link style, or a severity-tone palette update now costs
one edit instead of up to six. This is exactly the kind of investment
`CLAUDE.md`'s own engineering philosophy asks for ("every abstraction
must make the *next* change easier") — stated plainly as maintenance
investment, not a product outcome, consistent with how Milestone 20's
own postponed cleanup was framed.

## Future Growth

- **A future, separately-authorized visual-polish milestone** could
  resolve the two preserved inconsistencies (`StatCell` size,
  `StringList` spacing) if a human reviewer decides one should win —
  not decided or implied here.
- **A future fifth Intelligence-domain card** (if one is ever built)
  would adopt all five shared primitives from day one, the entire point
  of doing this extraction now rather than later.
- **`TrustPanel`'s nested evidence-list** could be revisited if a future
  change to `VerificationSummary`'s own claim shape ever makes it
  structurally closer to the standalone case — not anticipated now.

## Definition of Done

**The overriding requirement: users must not observe any functional or
visual difference after this milestone.** Concretely:

1. Five new files under `components/shared/`: `StatCell.tsx`,
   `EvidenceList.tsx`, `TagList.tsx`, `StringList.tsx`, `severityTone.ts`
   — each covering exactly the confirmed pattern above, with props
   sufficient to reproduce every existing call site's exact current
   output (including the three named deviations), and no speculative
   prop for a shape that doesn't exist today.
2. All six Decision Report components (`TrustPanel`,
   `MarketIntelligenceCard`, `CompetitorIntelligenceCard`,
   `BusinessIntelligenceCard`, `FinancialIntelligenceCard`,
   `DecisionSummaryPanel`) retrofitted to import from the new shared
   components instead of defining local equivalents — except
   `TrustPanel`'s nested evidence list, which stays local by design.
3. **Zero change to any component's props interface.**
4. **Zero change to `DecisionReport.tsx`.**
5. **Zero change under `lib/`.**
6. **Rendered-output verification, not spot-checking:** for each of the
   six components, capture the exact rendered HTML (via the established
   scratch-page fixture technique) against a representative populated
   fixture *before* touching that file, then again *after* its
   retrofit, and diff the two — expected result: byte-identical modulo
   React's own harmless hydration-comment markers (the same false-negative
   class already encountered and understood at Milestones 21–23).
   Any real difference is a bug to fix before proceeding, not an
   acceptable side effect.
7. `tsc --noEmit`, `eslint`, `next build` all clean.
8. `git status --short` touches only the five new `components/shared/`
   files and the six existing Decision Report component files — no
   `lib/` path, no schema, no route.
9. Nothing committed until explicitly requested.

---

*End of design specification. Awaiting review before any implementation
begins.*
