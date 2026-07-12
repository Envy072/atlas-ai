# Atlas AI — Milestone 18 Design Specification

**Financial Intelligence Depth: Knowing What We Don't Know, Precisely**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete design specification for Milestone 18,
written for review before any implementation begins.

Milestones 1–17 are complete and frozen. This milestone touches only
`lib/decision/` (additive — Decision consuming a richer input). Unlike
Milestones 16 and 17, **it does not add a single new file to
`lib/financial/`** — the reasoning for why is the central finding of
this design (Section 5).

---

## Pre-Design Verification

Every claim below is grounded in a direct read of the current codebase.

**Read in full:** `FINANCIAL_PLATFORM.md`, `PRODUCT_BACKLOG.md`,
`ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`, `MILESTONE_16_DESIGN.md`,
`MILESTONE_17_DESIGN.md` (direct precedents this milestone follows, and
in one respect, deliberately departs from).

**Read directly, file by file:** `lib/financial/index.ts`,
`lib/financial/schemas/{financial,estimate,fundingStage,discovery}.schema.ts`,
`lib/financial/knowledge/{financialDiscovery,financialProfileBuilder,profileMerger}.ts`,
`lib/financial/metrics/ltvToCacRatio.ts`, `lib/financial/types/storage.ts`,
`lib/pipeline/stages/financial.ts`, `lib/decision/engine/decisionEngine.ts`
(re-verified post-Milestone-17), and — via grep, not assumption — every
call site of `mergeFinancialProfile`/`FinancialKnowledgeStore`/
`discoverFinancials` in the entire repository.

### Knowledge Platform Audit

`lib/financial/` is the richest of the three knowledge platforms audited
so far — fifteen folders, real (not placeholder) derived-metric
composition (`metrics/ltvToCacRatio.ts`), a generalized honest-estimate
wrapper (`FinancialEstimateSchema`) shared across eleven numeric fields,
full forecast/valuation/risk/scoring architecture. Every numeric
estimator (`economics/`, `forecast/`, `valuation/`) is confirmed
architecture-only — `value` deliberately absent, a real methodology
note present — exactly the discipline the two prior platforms hold
themselves to.

**One real, working piece of composition already exists and needs no
changes:** `metrics/ltvToCacRatio.ts`'s `computeLtvToCacRatio(ltv, cac)`
genuinely computes `ltv.value / cac.value` whenever both are known, and
honestly propagates "unknown" whenever either isn't — verified directly.
This is the platform's own working proof that "real composition over
not-yet-real inputs" is possible without fabrication; it needs nothing
from this milestone.

### Usage Audit

`knowledge/financialDiscovery.ts`'s `discoverFinancials()` calls only
`runResearch()`, `discoverCompetitors()`, `discoverMarket()`, and
`buildFinancialProfile()` — never `mergeFinancialProfile()`, never
`FinancialKnowledgeStore`. Grep-confirmed: **zero** call sites of
`mergeFinancialProfile` or `lib/financial`'s own `createStore()` exist
anywhere outside `lib/financial/` itself — the same structural shape
Milestones 16 and 17 found and fixed for their own platforms.

**This milestone does not fix it the same way, and Section 5 explains
why in detail.** The short version: unlike a company name or a fixed
industry category, nothing in `FinancialProfile`'s design gives it a
natural cross-analysis identity to resolve against.

### Consumer & Dependency Audit

- `lib/business/knowledge/businessDiscovery.ts` and
  `lib/decision/engine/decisionEngine.ts` **each independently call
  `discoverFinancials()`** — the same redundant-discovery pattern
  Milestones 16/17 found for their own platforms, now confirmed a third
  time for Financial.
- `decisionEngine.ts` (post-Milestone-17) consumes
  `financialDiscovery.profile.sources`/`.evidence` (evidence
  aggregation) and `.fundingStage` (for `decisionContext.fundingStage`)
  — nothing else of `FinancialProfile` reaches `DecisionProfile` today.
- **A checked-and-cleared hypothesis:** given Milestone 17 found a real,
  silent bug in `hasMarketIndustry` (a checklist boolean that was
  vacuously always `true`), this audit specifically checked whether
  `CoverageChecklist.hasFundingStage` has the same problem. It does not:
  `buildFinancialProfile()`'s only real call site
  (`financialDiscovery.ts`) never passes a `fundingStage` argument at
  all, so `FinancialProfile.fundingStage` is always `undefined` today,
  and `hasFundingStage: Boolean(input.decisionContext.fundingStage)`
  correctly, honestly evaluates `false` on every `DecisionProfile` built
  so far. **No fix needed here — checked, not assumed.**

### A decisive finding: `mergeFinancialProfile()`'s own comment already
solved "Knowledge vs Observation," more explicitly than Market's did

Direct quote, `lib/financial/knowledge/profileMerger.ts`:

> Deliberately does NOT touch any FinancialEstimate field (grossMargin,
> cac, mrr, ...) — those are only ever recomputed by
> knowledge/financialProfileBuilder.ts's economics/ calls, never
> hand-merged, so a merge can never silently overwrite a real estimate
> with a stale one or vice versa.

This is the exact reasoning Milestone 17's "Knowledge vs Observation"
review had to derive from indirect evidence (an absent field in an
interface, a schema's own `asOfYear` marker). Here, Milestone 8's
original author stated it outright. Further confirmed:
`MergeFinancialProfileInput` also excludes `fundingStage` — a
funding round is exactly as point-in-time as a burn rate (a company
progresses pre-seed → seed → Series A, it doesn't "accumulate" funding
stages), and this too was already correctly excluded from merging,
without needing this review to discover it.

### The central architectural discovery: no natural identity to
accumulate against

`CompanyProfile` accumulates against a company **name**.
`MarketProfile` accumulates against a fixed **industry** category.
`FinancialKnowledgeStore`'s own interface (`types/storage.ts`) has
`getById`, `findByFundingStage`, `list`, `upsert`, `delete` — **no
lookup keyed on anything resembling "this specific startup idea" or "the
same analysis, re-run."** `findByFundingStage` returns every profile at
a given stage (an array) — useful for a future portfolio-wide query, not
for finding "the one profile that already exists for this idea."

**A `FinancialProfile` is not a shared fact about the world the way a
company or an industry is — it's specific to one startup's own,
unshared financial reality.** Two different fintech payments startups
do not have "the same" financial profile just because they share an
industry; a `MarketProfile` for "fintech" legitimately being shared
across many analyses is correct, a `FinancialProfile` being shared that
way would not be. `FINANCIAL_PLATFORM.md`'s own Future Roadmap names the
real, intended identity mechanism directly: *"API module exposes
discoverFinancials/scoreFinancials behind a thin route once Milestone 4
(Authentication) exists to scope profiles per user/project."* The real
identity key was always meant to be **per authenticated user's project**
— which requires Authentication (still unbuilt) to exist first. There is
no honest substitute identity to invent now.

### Stale documentation identified

- **`FINANCIAL_PLATFORM.md`'s "Status: not wired into the application"
  line** — same partial-staleness pattern as the two prior platforms:
  Milestone 14 wired `discoverFinancials()` into the live pipeline
  shallowly (fundingStage + evidence reach `DecisionProfile`); the deep
  accumulation gap remains, but see Section 5 for why closing it isn't
  this milestone's job the way it was for Competitors/Market.
- **`ARCHITECTURE.md`** — already known-stale; nothing new.
- **`ARCHITECTURE_REVIEW.md`** — still accurate for what it checked;
  its own praise for `ltvToCacRatio.ts` as "a real, working derived
  metric" is reconfirmed here, unchanged.

---

## 1. Purpose

Make the real, honest financial picture Atlas AI already computes —
methodology-documented estimates, a genuinely-composed LTV:CAC ratio,
structured (if currently empty) revenue/cost/risk records — actually
reach `DecisionProfile`, for the first time. Explicitly do **not**
attempt to make financial knowledge accumulate across analyses the way
Competitor and Market knowledge now does, because — unlike those two —
nothing about a `FinancialProfile`'s own nature or the current schema
supports that without inventing an identity mechanism this milestone has
no mandate to build.

## 2. Product Vision

> A financial analyst doesn't guess a number to look thorough — they
> state exactly what's known, what would be needed to know more, and
> never confuse a placeholder for a fact. The moment a fabricated number
> enters a real memo, the entire memo becomes untrustworthy, not just
> that number.

This milestone's entire value is in *not* crossing that line while still
making the real, structured, honestly-incomplete picture visible and
traceable.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| What's the revenue model? | If discovered — `revenueModel` reaches `DecisionProfile`, still usually absent in this environment. |
| What are CAC and LTV, and how were they derived? | The *methodology* — yes, always. The *value* — no, honestly absent (no billing/CRM data source exists). |
| Is the LTV:CAC ratio healthy? | Only once both are real — `computeLtvToCacRatio` is real, working composition, verified; it correctly reports "unknown" today. |
| What's the burn rate and runway? | No — `FinancialEstimate.value` stays absent for both; the real methodology note explains how they'd be computed. |
| Is there a break-even analysis? | No — `breakEven` is a `FinancialEstimate` like the others, honestly unset. |
| Is there a sensitivity analysis? | No — no such concept exists anywhere in this schema; not fabricated as a workaround. |
| What assumptions were made? | Yes — `financialAssumptions` is real, always populated with two evidence-backed statements (industry classification, competitor count). |
| What's the funding stage? | No — never populated by any real call site today; correctly absent, not silently wrong. |
| What remains unknown? | Yes, explicitly (Section 15/`decisionLimitations`) — the overwhelming majority of this milestone's own answer. |

## 4. Financial Reasoning

**How Atlas AI should think about a startup's financial picture, not how
it calculates one.** The honest posture: a financial estimate is only
as trustworthy as the real data behind it, and *no* real financial-data
source exists in this environment (no billing integration, no CRM
access, no real Crunchbase implementation — confirmed architecture-only
in Milestone 16's own Pre-Design Verification, unchanged). Given that:

- Atlas AI can **document methodology** (how a real CAC/LTV/burn
  rate/runway *would* be computed) — real, already built, valuable on
  its own (a founder reading "CAC = total sales+marketing spend ÷ new
  customers acquired" learns something true even with no number
  attached).
- Atlas AI can **compose real ratios from real inputs, once both exist**
  (`computeLtvToCacRatio`) — real, working, verified.
- Atlas AI **cannot estimate a dollar figure from unstructured search
  text without fabricating one.** A search snippet mentioning "$2M ARR"
  for one company is not evidence of *this* startup's own ARR — treating
  third-party figures as if they were the analyzed startup's own would
  be a direct fabrication, not an estimate.

This milestone's reasoning posture: **expose real methodology and real
composed ratios; never infer a number that was never actually measured.**

## 5. Knowledge vs Observation

**Every numeric field on `FinancialProfile` is a point-in-time
observation, more thoroughly than any field on `MarketProfile` was.**
`FinancialEstimateSchema` (`grossMargin`, `operatingMargin`, `burnRate`,
`runway`, `breakEven`, `cac`, `ltv`, `ltvToCac`, `mrr`, `arr`,
`paybackPeriod` — eleven fields, one shared shape) has **no
`asOfYear`-equivalent field at all**, unlike `MarketSizeEstimateSchema`
(Milestone 17 found this gap already present in `MarketGrowthRateSchema`
— here, it's present in the *only* estimate shape this entire platform
uses). MRR measured today and MRR measured in six months are not "the
same fact, more evidence" — they are two different measurements of a
quantity that is, by definition, expected to change.

**`fundingStage` is also point-in-time, in a different way** — not a
number that drifts, but a discrete stage a company *progresses through*
(pre-seed → seed → Series A → ... → public) and never regresses from.
Already correctly excluded from `MergeFinancialProfileInput` (Pre-Design
Verification) — this milestone doesn't need to discover or fix this; it
was already right.

**What, if anything, is durable-knowledge-shaped?** `revenueModel`
(a business-model choice, changes rarely) and the *names* of
`revenueStreams`/`expenses`/`financialRisks` (structural categories, not
their current dollar amounts) are the closest analogues to Market's
durable facts. **But this milestone does not accumulate even these**
— see Section 6 for why the identity question (Pre-Design
Verification's central finding) makes the accumulation question moot
regardless of which individual fields would, in isolation, tolerate it.

**Conclusion: nothing in `FinancialProfile` accumulates this milestone.**
Not because every field would resist it (`revenueModel` wouldn't), but
because there is no correct *entity* to accumulate any of it against yet
(Section 6). A field-by-field accumulation strategy without a resolved
identity question underneath it would be solving the wrong layer of the
problem.

## 6. Financial Discovery Strategy

**Discovery does not change, and — unlike Milestones 16/17 — no
resolution/persistence step is added either.** `discoverFinancials()`
stays exactly as built. `synthesizeDecision()` takes the freshly-built,
already-unpersisted `FinancialProfile` `discoverFinancials()` already
returns and passes it directly onto `DecisionProfile.financialProfile` —
no match, no merge, no store.

**Why not build the identity mechanism anyway, given it's clearly
named as intended future work?** Considered directly. The honest
identity key — a real authenticated user's project — requires
Authentication (Milestone 4 in the original roadmap, still unbuilt).
Inventing a substitute now (e.g., a hash of the startup idea's text,
or a fuzzy-similarity matcher over idea descriptions) would mean:
building new matching logic with no real specification behind it,
risking two genuinely different ideas that happen to read similarly
being merged into one financial picture (a much higher-stakes mistake
here than a market-industry false match, since it would blend one
startup's real financial risk profile with an unrelated one's), and
solving a problem `PRODUCT_BACKLOG.md` never actually asked for. Not
built. Named explicitly as Future Growth (Section 19), not invented as
a workaround.

## 7. Evidence Strategy

Unchanged from the current, already-correct behavior:
`financialDiscovery.profile.sources`/`.evidence` already feed
`synthesizeDecision()`'s existing `aggregateEvidence()` call (confirmed,
Pre-Design Verification) — this milestone adds no new evidence path.
What's new is that the *same* profile object those sources/evidence came
from is now also exposed, whole, as `DecisionProfile.financialProfile`
— so a reader can see not just "evidence exists" but exactly which
`FinancialEstimate`/`assumption`/`risk` (once any are real) that evidence
was meant to support.

## 8. Confidence Strategy

**No new `CoverageChecklist` signal is added this milestone.**
Considered directly and rejected: every candidate signal either would be
vacuously always-true (`financialAssumptions.length > 0` —
`buildInitialAssumptions()` unconditionally returns two strings on every
real call, so this would repeat the exact `hasMarketIndustry` mistake
Milestone 17 just fixed) or already-covered by an existing, correctly-
computed signal (`hasFundingStage`, confirmed honestly `false` today —
Pre-Design Verification). Adding a signal that can't meaningfully vary
would be exactly the kind of theoretical abstraction the Complexity
Review is required to remove. `FinancialProfile.confidence` itself
(already real, computed from Research + Market discovery confidence,
unchanged) continues to be the honest signal available today.

## 9. Decision Relationship

Decision Intelligence continues owning synthesis — richer input only,
and a smaller change than Milestones 16/17 made:

- **`DecisionProfileSchema` gains one new, additive field:
  `financialProfile: FinancialProfileSchema`** — reused verbatim from
  `lib/financial`'s public barrel, always present (a `FinancialProfile`
  object always exists once discovery runs, just as `MarketProfile`
  always does).
- **`buildDecisionProfile()`'s `BuildDecisionProfileInput` gains
  `financialProfile: FinancialProfile`** (required, since
  `discoverFinancials()` always produces one).
- **`synthesizeDecision()` passes `financialDiscovery.profile` directly**
  as `financialProfile` — no new function call, no new import beyond the
  type itself.
- **No `CoverageChecklist`/`CHECKLIST_SIZE` change** (Section 8) —
  `decisionProfileBuilder.ts`'s existing checklist construction is
  untouched by this milestone. `profileMerger.ts` needs no change either
  (its own `{...existing, ...}` spread already carries any field not in
  its own `MergeDecisionProfileInput` through unchanged, exactly as it
  already does for `keyCompetitors`/`marketProfile`).
- Decision never estimates, forecasts, or scores a financial profile
  itself — everything it receives is `lib/financial`'s own, unmodified
  output.

## 10. Verification Relationship

No changes to `lib/verification/`. `financialDiscovery.profile.sources`/
`.evidence` already reach `DecisionProfile.sources`/`.evidence`
(unchanged), so `VerificationSummary` already reflects this evidence —
nothing new flows through this specific channel as a result of this
milestone (unlike Milestones 16/17, where accumulation made the
aggregated evidence set genuinely larger). `financialProfile` itself is
not separately exposed through `VerificationSummary` (Non-Goal) — a
future Dashboard/Reports concern.

## 11. Pipeline Relationship

**Nothing changes.** `lib/pipeline/stages/financial.ts` calls
`discoverFinancials()` and only that — unchanged.

## 12. Data Flow

```
synthesizeDecision(request)
  │
  ├─ runResearch(...) / discoverCompetitors(...) / discoverMarket(...) /
  │  discoverFinancials(...) / discoverBusiness(...)          [unchanged, concurrent]
  │
  ├─ resolveCompetitorKnowledge(...) → keyCompetitors            [Milestone 16, unchanged]
  ├─ resolveMarketKnowledge(...) → marketProfile                 [Milestone 17, unchanged]
  │
  ├─ (no resolution step for Financial — Section 6)               NEW ABSENCE, DELIBERATE
  │     financialDiscovery.profile is used directly
  │
  ├─ aggregateEvidence([..., financialDiscovery.profile.sources, ...])  [UNCHANGED — already wired]
  │
  └─ buildDecisionProfile({ ..., financialProfile: financialDiscovery.profile })  EXTENDED
        │
        ▼
  DecisionProfile { ..., financialProfile: FinancialProfile }
        │
        ▼ (unchanged — Milestone 14's existing chain)
  VerificationSummary  (unchanged evidence set — Section 10)
```

**Where financial knowledge enters:** at one new, explicit point —
`financialDiscovery.profile`, assigned directly to
`DecisionProfile.financialProfile`, with no intermediate resolution
step.

## 13. Information Flow

The honest trail this milestone establishes: **a financial claim → the
single-analysis `FinancialProfile` it belongs to (never blended with
another analysis') → the real `Evidence`/`Source` backing it, or the
honest methodology note explaining why no value exists yet.** Distinct
from Milestones 16/17's chain in one respect: there is no "this
accumulated across N runs" link to trace, because nothing accumulates —
every `FinancialProfile` a reader ever sees is that one analysis's own,
complete, honestly-incomplete picture.

## 14. Risks

- **A reader may expect `financialProfile` to accumulate like
  `keyCompetitors`/`marketProfile` do, since it now sits right next to
  them on `DecisionProfile`.** Mitigated by this design's own explicit
  documentation (Sections 5/6) and by the fact that `FinancialProfile`
  itself carries no `refresh.refreshReason: "scheduled"` history the
  way an accumulated profile would (`refresh.refreshReason` will always
  read `"initial_discovery"` for a Decision-sourced `financialProfile`,
  a real, honest signal that this is a fresh, unaccumulated read).
- **Zero observable numeric change in this environment** — every
  `FinancialEstimate.value` stays absent regardless of this milestone;
  the only observable change is structural (the object reaches
  `DecisionProfile` at all, with its real methodology notes and real,
  correctly-computed `ltvToCac` unknown-state visible for the first
  time).
- **Redundant `discoverFinancials()` calls remain** (Business, Decision)
  — same Design Debt class as Milestones 16/17, not fixed here.

## 15. Non-Goals

- Does not add a `resolveFinancialKnowledge()`-style function, a default
  store, or any persistence wiring — no natural identity exists to
  resolve against (Section 6).
- Does not estimate, calculate, or infer any real value for revenue,
  profit, costs, CAC, LTV, burn rate, runway, valuation, margins, or any
  TAM-derived projection. Every one of these stays exactly as
  honestly-unset as before this milestone.
- Does not add sensitivity analysis — no such concept exists in this
  schema, and none is added as a workaround.
- Does not add a `hasFinancialProfile`-style `CoverageChecklist` signal
  (Section 8) — no non-vacuous version of one exists today.
- Does not populate `fundingStage` — no reliable source exists.
- Does not introduce an LLM call anywhere (Deterministic Reasoning,
  below).
- Does not touch `lib/pipeline/`, `lib/analysis-session/`,
  `lib/verification/`, any `app/`/`components/` file, or Decision's own
  `findings/`/`redflags/` placeholder derivation.
- Does not change who calls `discoverFinancials()` (Business/Decision's
  own redundant calls stay as-is — Design Debt).

## 16. Success Metrics

- `DecisionProfile.financialProfile` is populated end to end from a real
  `synthesizeDecision()` call, with a real, non-fabricated methodology
  note visible on at least one `FinancialEstimate` field (e.g. `cac`).
- `computeLtvToCacRatio`'s existing "unknown until both inputs are real"
  behavior is confirmed to survive unchanged through
  `DecisionProfile.financialProfile.ltvToCac`.
- `git status --short` touches only `lib/decision/` — zero changes
  anywhere under `lib/financial/`.
- No new `CoverageChecklist` field, no new file under `lib/financial/`,
  no new default store.

## 17. Design Debt

1. **No accumulation wiring exists for `FinancialProfile`** — not an
   oversight; a reviewed, documented, deliberate deferral pending
   Authentication (Milestone 4) providing the real per-project identity
   key `FINANCIAL_PLATFORM.md` always intended.
2. **Redundant `discoverFinancials()` calls** (Business, Decision) — same
   class as Milestones 16/17's equivalent debt, not fixed here.
3. **`MemoryFinancialStore` remains completely unwired**, not merely
   undurable — a stronger form of the storage-layer debt the two prior
   platforms carry, since here even the memory backend has no real
   caller at all.

## 18. Product Readiness

Honest assessment: this milestone makes the real, structured financial
picture — methodology notes, a genuinely-composed LTV:CAC ratio, the
assumptions ledger — reachable from `DecisionProfile` for the first
time, closing a real (if narrow) part of `PRODUCT_BACKLOG.md`'s "sources
for every financial estimate" and "CAC/LTV explanation" asks (the
*explanation* is now visible; the *number* remains honestly absent).
It does **not** close "real calculations," "break-even analysis," or
"sensitivity analysis" — none of these have a real data source or
computation path today, and this milestone does not fabricate one. It
also does not make Financial Intelligence "accumulate and improve over
time" the way Competitor and Market Intelligence now do — a deliberate,
reasoned exception, not a shortfall relative to those two.

## 19. Future Growth

- **Once Authentication (Milestone 4) exists**, a future milestone can
  give `FinancialProfile` a real identity (per authenticated user's
  project) and only then build the `resolveFinancialKnowledge()`-style
  wiring Milestones 16/17 established the template for — the exact
  sequencing `FINANCIAL_PLATFORM.md`'s own Future Roadmap already named.
- **Once a real billing/CRM/financial-data integration exists**,
  `economics/`'s placeholder estimators can be replaced one at a time —
  `computeLtvToCacRatio` already demonstrates the composition layer
  needs no changes when that happens.
- **What does not need to change:**
  `DecisionProfileSchema.financialProfile`'s shape (already
  `FinancialProfile`, reused verbatim) absorbs all of the above
  automatically — zero further `lib/decision` schema changes needed for
  either future milestone to land its own enrichment.

## 20. Definition of Done

1. `DecisionProfileSchema` gains `financialProfile: FinancialProfileSchema`,
   imported from `lib/financial`'s public barrel.
2. `decisionProfileBuilder.ts`'s `BuildDecisionProfileInput` gains a
   required `financialProfile: FinancialProfile`; the returned object
   includes it unchanged.
3. `decisionEngine.ts` passes `financialDiscovery.profile` as
   `financialProfile` into `buildDecisionProfile()` — no new function
   call, no new store, no new file anywhere under `lib/financial/`.
4. No `CoverageChecklist`/`CHECKLIST_SIZE` change; `profileMerger.ts`
   requires no edits (verify this remains true at implementation time —
   its own spread should already carry `financialProfile` through).
5. A verification scenario proves: (a) `financialProfile` reaches
   `DecisionProfile` end to end from a real `synthesizeDecision()` call,
   (b) at least one `FinancialEstimate` field's real methodology note is
   visible and its `value` honestly absent, (c) `ltvToCac` correctly
   reports "unknown" given today's placeholder inputs.
6. `tsc --noEmit`, `eslint`, `next build` all clean.
7. `git status --short` touches only `lib/decision/`.
8. Nothing committed until explicitly requested.

---

## Deterministic Reasoning

**Why deterministic reasoning is appropriate here, more urgently than
for Market.** Every reason Milestone 17's "Deterministic Reasoning"
section gave still holds (zero LLM precedent anywhere in six platforms,
confirmed again this milestone; an LLM's failure mode is confident
fabrication, not honest absence; the decision to introduce one is bigger
than a single "Depth" milestone's mandate) — restated here, not
re-derived, since the reasoning is identical. **Financial figures raise
the stakes further than market trends did:** a hallucinated "market is
growing" reads as an opinion; a hallucinated "$40K MRR, $12K CAC" reads
as a fact, with the specific numeric precision that makes fabrication
most convincing and most dangerous — precisely the failure mode
`PRODUCT_BACKLOG.md`'s Trust & Evidence complaint exists to eliminate,
and precisely why the user's own explicit "Unknowns" list for this
milestone (revenue, profit, costs, CAC, LTV, burn rate, runway,
valuation, margins, TAM-derived projections) reads as a list of the
outputs most likely to be *mistaken* for real due diligence if
fabricated, not merely a list of hard-to-estimate numbers.

**Future work, not this milestone:** if a real financial-data source
(billing integration, CRM access, a real Crunchbase implementation)
ever exists, an LLM *summarizing already-real, already-sourced numbers*
(not inventing them) could plausibly be lower-risk than an LLM asked to
produce the numbers themselves — that distinction (summarization over
real data vs. generation from absent data) is worth preserving for
whoever designs that future work, but is not evaluated further here.

---

## Complexity Review

- **The absent `resolveFinancialKnowledge()` was the primary abstraction
  challenged this milestone**, and removed — not built, then removed;
  never built, because Section 6's analysis concluded it had no valid
  identity to operate against. This is the review working as intended:
  the correct outcome of "challenge every abstraction" is sometimes "do
  not introduce it," not "introduce a smaller version of it."
- **No `hasFinancialProfile` checklist signal added** — every candidate
  was either vacuous or redundant (Section 8).
- **No new schema, no new store, no new file under `lib/financial/`** —
  the smallest possible diff that satisfies "make FinancialProfile reach
  DecisionProfile," directly satisfying "prefer enriching existing
  models over introducing parallel models" by enriching `DecisionProfile`
  alone.
- **No LLM integration** — see Deterministic Reasoning above.

---

## Performance Review

- **Computational hotspots:** none — this milestone adds zero new
  function calls to the hot path; `financialDiscovery.profile` is
  already computed by the existing `Promise.all`, merely referenced an
  additional time.
- **Cache opportunities:** none applicable — there is no store to cache
  against (Section 6). `computeLtvToCacRatio` remains O(1).
- **Scaling risks:** none introduced. If anything, this milestone
  reduces future risk relative to Milestones 16/17's pattern: no
  per-analysis store growth occurs for Financial data at all, since
  nothing is persisted.

---

## Observability

- **Runtime behavior:** `DecisionProfile.financialProfile` populates on
  every `synthesizeDecision()` call, always structurally complete
  (every `FinancialEstimate` field present with a methodology note),
  usually value-empty in this environment.
- **Debugging entry points:** `lib/financial/knowledge/financialDiscovery.ts`
  for how the profile was built; `lib/decision/engine/decisionEngine.ts`
  for how it reaches `DecisionProfile` — no new file to look in beyond
  what already exists.
- **Financial quality indicators:** whether `financialProfile.cac`/`.ltv`/
  `.ltvToCac` carry a real `value` (today: no) — the single clearest
  signal of whether real financial data has started flowing in from a
  future data source.
- **Evidence quality indicators:** `financialProfile.sources.length`/
  `.evidence.length` — unchanged from before this milestone, already
  observable.
- **Confidence calibration indicators:** `financialProfile.confidence`
  (real, computed from Research + Market confidence, unchanged) should
  track the same inputs it always has — this milestone changes nothing
  about how it's computed.
- **Failure indicators:** a `financialProfile.ltvToCac.value` present
  while `cac`/`ltv` are absent would indicate a genuine regression in
  `computeLtvToCacRatio`'s own honesty guarantee — should never occur;
  worth a direct check during verification precisely because it would
  be a severe, silent trust violation if it ever did.

---

## Architectural Discovery

- **The "built but never wired" pattern is now confirmed a third time**
  (Competitors, Market, Financial) — but this time, the correct
  response was *not* to wire it the same way, because the entity this
  platform accumulates knowledge about doesn't have a resolvable
  identity yet. Recorded as a refinement of the pattern, not a
  contradiction of it: "built but never wired" doesn't always mean
  "should be wired the same way as its siblings" — sometimes the
  correct fix is recognizing the wiring was never the right shape to
  begin with.
- **`mergeFinancialProfile()`'s own explanatory comment already
  contained the "Knowledge vs Observation" reasoning this review process
  had to derive independently for Market** — worth noting for whoever
  designs Milestone 19 or beyond: reading a function's own comments in
  full, not just its signature, surfaced a real design decision already
  made and already correct, before this review had to re-derive it from
  scratch. Not expanded into new scope here — a reading-discipline note,
  not a code change.

---

*End of design specification. Awaiting review before any implementation
begins.*
