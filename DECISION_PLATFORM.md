# Atlas AI — Decision Intelligence Platform

Milestone 10: Decision Intelligence Platform. This document describes
`lib/decision/` — the reusable decision engine that sits on top of every
knowledge platform built so far (`lib/research/`, `lib/competitors/`,
`lib/market/`, `lib/financial/`, `lib/business/`) and produces reusable
**decision artifacts**: a `DecisionProfile`, and three purpose-built
reshapings of it (`InvestmentMemo`, `DueDiligenceReport`,
`ExecutiveSummary`). It is not a UI, not a PDF generator, not a report
template — it is the layer every future report-shaped consumer (Investor
Reports, Due Diligence, Investment Memo, Executive Summary, Funding
Readiness, Acquisition Review, Bank Lending Assessment, Accelerator
Evaluation) is expected to consume instead of implementing business
analysis itself.

**Status (Milestone 10): not wired into the application.** Nothing in
`lib/analysis/`, `lib/research/`, `lib/competitors/`, `lib/market/`,
`lib/financial/`, `lib/business/`, `lib/store/`, `app/api/`, or
`lib/schemas/` imported from `lib/decision/` — those nine paths were
frozen that milestone and remained completely unchanged. `lib/decision/`
was free-standing at the time, and consumed exactly five things from
outside itself: `lib/research`'s public barrel (`runResearch`,
`Source`/`Evidence`), `lib/competitors`'s public barrel
(`discoverCompetitors`, `RefreshMetadata`, `computeNextRefresh`/
`determineRefreshPriority`), `lib/market`'s public barrel
(`discoverMarket`, `Severity`), `lib/financial`'s public barrel
(`discoverFinancials`, `FundingStage`), and `lib/business`'s public
barrel (`discoverBusiness`, `CompetitivePosition`, `BusinessHealth`,
`Recommendation`) — never a deep import, never a direct provider call.

**Update (Milestone 31): partially wired.** `DecisionProfile` synthesis
itself (`synthesizeDecision()`) has in fact been live since Milestone
12, via `lib/pipeline/stages/decision.ts` — every real analysis a
founder runs already produces one. What remained genuinely unwired
until Milestone 31 were this platform's three downstream artifacts:
`buildExecutiveSummary()`, `buildInvestmentMemo()`, and
`buildDueDiligenceReport()` each had zero callers anywhere in the
application, confirmed by direct grep, from Milestone 10 through
Milestone 30. `app/projects/[id]/executive-summary`,
`app/projects/[id]/memo`, and `app/projects/[id]/diligence` now call
each of these three directly — no service wrapper, no new schema, no
change to any of the functions themselves. Everything else this
document describes (thesis/finding/red-flag/recommendation generation,
real readiness assessment, a Supabase-backed store) remains exactly as
unwired/architecture-only as it was before Milestone 31 — see
`MILESTONE_31_DESIGN.md`'s own Non-Goals for the explicit boundary.

**Architectural principle, as given:** Decision Intelligence is a
synthesis layer. It orchestrates and synthesizes only — it must never
perform research, discover competitors, classify markets, estimate
financial metrics, derive business strategy, or duplicate any lower
layer's logic.

---

## Why This Exists

Five platforms each answer a narrow question well. None of them answer
"is this decision-ready, and in what shape does a bank/investor/
accelerator actually need to see it?" — that requires combining all five
into artifacts shaped for a specific downstream reader, without any of
those readers re-deriving business analysis themselves. Decision
Intelligence exists to be that combining-and-reshaping layer, built once.

---

## Architecture

Sixteen folders. `engine/` plays the same role `knowledge/` played in
every prior platform (build, merge, orchestrate discovery); the rest
each own one facet of the `DecisionProfile`, or one downstream artifact:

```
lib/decision/
├── thesis/            Investment Thesis — architecture only, no AI generation, no conclusions
├── findings/           Reusable Finding objects
├── redflags/             Reusable RiskFinding objects — evidence-backed only
├── evidence/       Real aggregation of Source/Evidence across all 5 platforms
├── confidence/        Real, separately-tracked DecisionConfidence
├── readiness/           5 readiness dimensions — architecture only, no fake scores
├── recommendations/  Aggregates lib/business's own Recommendation objects — never generates
├── memo/                 InvestmentMemo artifact — real reshaping of a DecisionProfile
├── diligence/       DueDiligenceReport artifact — 10 sections, real reshaping
├── executive/         ExecutiveSummary artifact — real selection, no generated text
├── engine/       Builds/merges DecisionProfile records; orchestrates synthesis
├── refresh/       Decides when/why/how urgently to re-synthesize a decision
├── storage/         DecisionKnowledgeStore interface + backends
├── schemas/        Every Zod schema — the single source of truth per shape
├── types/            Non-validated contracts (storage interface, coverage checklist)
└── utils/              URL dedupe, generic list dedupe
```

### Data flow

```
engine.synthesizeDecision({ startupIdea })
  │
  ├─ lib/research.runResearch({ topic: "investment decision synthesis for: <idea>" })
  ├─ lib/competitors.discoverCompetitors({ startupIdea })
  ├─ lib/market.discoverMarket({ startupIdea })
  ├─ lib/financial.discoverFinancials({ startupIdea })
  ├─ lib/business.discoverBusiness({ startupIdea })
  │     (all five called concurrently via Promise.all — never a provider,
  │      never an internal function of any of the five)
  │
  ├─ evidence.aggregateEvidence(...)   → merges + dedupes Source/Evidence
  │     from Research's own result, Market/Financial/Business's own
  │     profiles, and every Competitor candidate — real aggregation only
  │
  ├─ findings.deriveFindings(startupIdea, evidence)   → Finding[] (REAL as of Milestone 34 —
  │     evidence-constrained generation via lib/services/openai.ts, gated end to end by
  │     traceability.verifyClaimTraceability(); called here, ahead of buildDecisionProfile,
  │     because real generation is async and buildDecisionProfile stays synchronous — see
  │     "Findings" below)
  │
  ├─ redflags.deriveCriticalRisks(startupIdea, evidence) → RiskFinding[] (REAL as of Milestone 35 —
  │     evidence-constrained generation via lib/services/openai.ts, gated end to end by
  │     traceability.verifyClaimTraceability(); called here for the identical reason
  │     deriveFindings() is — see "Red Flags" below)
  │
  └─ engine.buildDecisionProfile({ decisionContext, businessSummary, swot, sources, evidence, findings, criticalRisks })
        │
        ├─ thesis.deriveEmptyThesis()         → investmentThesis (honest, empty)
        ├─ confidence.computeDecisionConfidence() → confidenceSummary (real, computed)
        ├─ readiness.deriveDecisionReadiness() → decisionReadiness (honest, unassessed)
        │
        └─ storage.DecisionKnowledgeStore.upsert(profile)   ← caller's responsibility

Later, on demand:
  memo.buildInvestmentMemo(profile, recommendations?)     → InvestmentMemo
  diligence.buildDueDiligenceReport(profile)               → DueDiligenceReport (8 sections + evidence + unknowns)
  executive.buildExecutiveSummary(profile, maxItems?)      → ExecutiveSummary
  refresh.collectStaleDecisions(profiles, now)             → priority-ordered re-synthesis queue
  engine.mergeDecisionProfile(existing, newData)           → accumulated DecisionProfile
```

Nothing here is wired into a route or a Server Component yet.

---

## Knowledge Flow — Never Bypassing, Never Recomputing

Verified concretely: `synthesizeDecision()` calls `runResearch()`,
`discoverCompetitors()`, `discoverMarket()`, `discoverFinancials()`, and
`discoverBusiness()` — all five, concurrently, every one a public
`discover*()`/`runResearch()` entry point, never a provider and never an
internal function. Real data is reused, not re-derived: `marketIndustry`
comes directly from `discoverMarket().profile.industry`, `fundingStage`
from `discoverFinancials().profile.fundingStage`, and the entire
`strengths`/`weaknesses`/`opportunities`/`threats` SWOT is copied verbatim
from `discoverBusiness().profile.businessStrengths`/etc. — Decision
Intelligence never recomputes a SWOT, never re-classifies an industry,
never re-derives a revenue model.

This does mean every one of Business's own upstream calls is repeated
here (Research/Competitors/Market/Financial all get called again,
directly, in addition to being called again *inside* `discoverBusiness()`
itself) — this is intentional and consistent with every prior platform's
own pattern (verified in `ARCHITECTURE_REVIEW.md` Check 3: Business calls
Financial+Market+Competitors+Research directly even though Financial
already calls Market+Competitors+Research internally). "Never bypass a
layer" means calling every layer's own public entry point, not
economizing on redundant calls by reaching around one.

---

## Decision Synthesis

**This milestone's entire responsibility.** `engine/decisionProfileBuilder.ts`'s
`buildDecisionProfile()` never performs research, never discovers
competitors, never classifies a market, never estimates a financial
metric, and never derives a business strategy — it only:

1. **Really passes through** already-discovered values (`businessModel`,
   SWOT, `marketIndustry`, `fundingStage`) without altering them.
2. **Honestly defaults to empty/absent** wherever no real synthesis
   engine exists yet (`investmentThesis`, `keyFindings`,
   `decisionReadiness` — see each facet's own "architecture only"
   discipline below), each documented with why. `criticalRisks` was
   part of this list before Milestone 35 — see "Red Flags" below for
   its own real-generation update.
3. **Really computes** the few things that are genuinely derivable facts,
   not judgments: `confidenceSummary` (see Confidence Model below) and
   `openQuestions` (a real presence/absence check — e.g. "Value
   proposition has not been established yet." is emitted only when
   `businessSummary.valueProposition` is actually absent, never a guessed
   gap) and `decisionLimitations` (a true statement about this platform's
   own current capability — "scoring dimensions ... are architecture-only
   placeholders" is always true today, and a second limitation is added
   only when the aggregated evidence set is actually empty).

### Investment Thesis — Architecture Only

`schemas/thesis.schema.ts`'s `InvestmentThesis` deliberately has **no
conclusion or verdict field** — it represents the raw material (positive
arguments, negative arguments, unknowns, contradictions, supporting
evidence) a thesis is built from, never a synthesized judgment.
`thesis/investmentThesis.ts`'s `deriveEmptyThesis()` returns every field
empty; `buildInvestmentThesis()` is the real constructor a future module
calls once it has real, evidenced arguments to record.

### Due Diligence — Architecture Only, 10 Sections

`schemas/diligence.schema.ts`'s `DueDiligenceReport` supports all ten
named sections (Business, Market, Competition, Financial, Operations,
Technology, Legal, Execution, Evidence, Unknowns).
`diligence/dueDiligenceReport.ts`'s `buildDueDiligenceReport()` groups
`profile.keyFindings` into the eight domain sections by their own
`category` field (a `Finding` categorized `"general"` belongs to none of
them — the honest outcome, not a bug), and reuses `profile.evidence`/
`profile.openQuestions` verbatim for the two cross-cutting sections.

### Findings

`schemas/finding.schema.ts`'s `Finding` supports `category`, `severity`
(reusing `lib/market`'s own three-level `Severity`), `summary`,
`evidence`, `confidence`. `findings/findingBuilder.ts`'s `buildFinding()`
is the real constructor, unmodified since Milestone 10.

**Update (Milestone 34): `deriveFindings()` is real.** It no longer
returns `[]` unconditionally — it is now `async`, takes
`(startupIdea, evidence)`, and calls `lib/services/openai.ts`'s
`generateCandidateFindings()` to produce candidate findings
constrained to the evidence it was given. Every candidate is checked by
`lib/decision/traceability/claimVerifier.ts`'s `verifyClaimTraceability()`
(Milestone 33, unmodified) before it can become a real `Finding` — a
candidate citing evidence that doesn't resolve is dropped entirely, never
surfaced. A failed generation call, or an empty evidence array, still
degrades to `[]` — the same honest-empty outcome this platform has always
produced when it has nothing real to report, now reached via a real
attempt rather than an unconditional stub. Called from
`engine/decisionEngine.ts`'s `synthesizeDecision()` (already async), not
from inside `buildDecisionProfile()` (kept synchronous) — see the pipeline
diagram above.

### Red Flags — Evidence-Backed Only

`schemas/riskFinding.schema.ts`'s `RiskFinding` uses its own four-level
`RedFlagSeverity` (`critical`/`high`/`medium`/`low`) — a genuinely
different scale from `Finding`'s three-level `Severity`, since a red flag
needs an escalation tier above "high" ordinary findings don't. **"Evidence-
backed only" is enforced structurally, not just documented**: the schema
requires `evidence.length >= 1`. Verified live: constructing a
`RiskFinding` with an empty evidence array correctly throws.

**Update (Milestone 35): `deriveCriticalRisks()` is real.** It no
longer returns `[]` unconditionally — it is now `async`, takes
`(startupIdea, evidence)`, and calls `lib/services/openai.ts`'s
`generateCandidateRisks()` to produce candidate risks constrained to
the evidence it was given, using its own risk-specific system prompt
(distinct from `generateCandidateFindings()`'s own, since a critical
risk is framed as a reason the idea could fail, not a neutral
observation). Every candidate is checked by
`lib/decision/traceability/claimVerifier.ts`'s `verifyClaimTraceability()`
(Milestone 33, unmodified) before it can become a real `RiskFinding` —
a candidate citing evidence that doesn't resolve is dropped entirely,
never surfaced. `verifyClaimTraceability()`'s own "matched" guarantee
(non-empty `resolvedEvidence`) satisfies `RiskFindingSchema`'s stricter
`evidence.length >= 1` requirement with no additional check needed. A
failed generation call, or an empty evidence array, still degrades to
`[]` — the same honest-empty outcome this platform has always produced
when it has nothing real to report, now reached via a real attempt
rather than an unconditional stub. Called from
`engine/decisionEngine.ts`'s `synthesizeDecision()` (already async),
not from inside `buildDecisionProfile()` (kept synchronous) — see the
pipeline diagram above.

---

## Evidence Model

`evidence/evidenceAggregator.ts`'s `aggregateEvidence()` is real
aggregation, never generation: it flattens and dedupes (by URL) the
`Source`/`Evidence` lists already gathered by Research's own call, plus
whatever each of Market/Financial/Business's own profile already carries,
plus every Competitor candidate's own sources/evidence. Verified live:
identical sources/evidence supplied twice collapse to one each.

---

## Confidence Model

**Four separate dimensions, never collapsed into one number, and never a
stand-in for business quality** (`schemas/confidence.schema.ts`'s own
doc comment states this explicitly — a business can be genuinely
excellent with thin evidence, or genuinely weak with thorough evidence).
`confidence/decisionConfidence.ts`'s `computeDecisionConfidence()` derives
all four from data already known:

- **`evidenceConfidence`** — the average `confidence` across all
  aggregated `Evidence`; `0` when there's none.
- **`coverage`** — what fraction of an 8-item structural checklist
  (business model, value proposition, customer problem, market industry,
  funding stage, findings, critical risks, evidence — all present or
  not) is actually populated.
- **`unknownPercentage`** — coverage's complement, tracked as its own
  named field per this milestone's explicit instruction, so a future
  refinement can diverge from a strict `100 - coverage` without a schema
  change.
- **`dataFreshnessDays`** — the average age (in days) of the aggregated
  evidence's own `retrievedAt` timestamps; **absent, never `0`**, when
  there's no evidence to average (a `0` would falsely claim "perfectly
  fresh").

Verified live: a populated checklist with 5/8 true items produces
`coverage: 63`, `unknownPercentage: 37`; an empty checklist with no
evidence produces `coverage: 0` and `dataFreshnessDays: undefined` (not
`0`) — the honest result, not a bug.

---

## Recommendations — Reuse Only

`recommendations/recommendationAggregator.ts` imports `Recommendation`
directly from `lib/business`'s public barrel — never redefined.
`aggregateRecommendations()` dedupes by `id` across however many lists a
caller supplies; `sortRecommendationsByPriority()` orders them
urgent-first. **Decision Intelligence never generates a recommendation**
— every one it touches was already constructed by a caller via
`lib/business`'s own `buildRecommendation()`.

---

## Readiness — Architecture Only, No Fake Scores

`schemas/readiness.schema.ts`'s `DecisionReadiness` covers all five named
dimensions (Investment, Funding, Expansion, Operational, Technology),
each a `ReadinessAssessment` with an optional `level`.
`readiness/decisionReadiness.ts`'s `deriveDecisionReadiness()` leaves
every `level` absent — the same discipline `lib/business`'s
`deriveOverallHealth()` established: how much is known and how ready the
business actually is are different questions, and deriving a "readiness"
score from mere data-completeness would be exactly the dishonest
shortcut this platform (and `ARCHITECTURE_REVIEW.md`) explicitly calls
out as wrong.

---

## Storage

`types/storage.ts`'s `DecisionKnowledgeStore` (`getById`, `list`,
`upsert`, `delete`) — deliberately **no** `findByX` secondary index, since
a `DecisionProfile` has no shared-categorical attribute of its own worth
indexing on (funding stage and health rating both live one layer down, on
the Financial/Business profiles it references — indexing on them here
would just be a duplicate of those platforms' own stores).
`storage/memoryStore.ts`'s `MemoryDecisionStore` is real;
`SupabaseDecisionStore`/`PostgresDecisionStore`/
`KnowledgeWarehouseDecisionStore` (the last adding one warehouse-specific
`aggregateConfidence()` method) are architecture-only and honestly throw.

---

## Schemas

One Zod schema per shape, no hand-duplicated types — `schemas/`:
`enums.ts` (`FindingCategory`, `RedFlagSeverity`, `ReadinessLevel`),
`context.schema.ts` (`DecisionContext`, reusing `lib/financial`'s
`FundingStage`), `businessSummary.schema.ts` (`BusinessSummary`, reusing
`lib/business`'s `CompetitivePosition`/`BusinessHealth`),
`thesis.schema.ts`, `finding.schema.ts` (reusing `lib/market`'s
`Severity`), `riskFinding.schema.ts`, `confidence.schema.ts`,
`readiness.schema.ts`, `decision.schema.ts` (`DecisionProfile`, reusing
`lib/research`'s `Source`/`Evidence` and `lib/competitors`'s
`RefreshMetadata`), `discovery.schema.ts`, `memo.schema.ts` (reusing
`lib/business`'s `Recommendation`), `diligence.schema.ts`,
`executive.schema.ts`.

## Types

`types/storage.ts` — the `DecisionKnowledgeStore` contract.
`types/confidence.ts` — `CoverageChecklist`, the plain (non-schema)
presence/absence input `computeDecisionConfidence()` consumes.

---

## Runtime Verification

Exercised live via a temporary scratch route
(`app/decision-platform-sanity-check/page.tsx`) against the running dev
server, then deleted. **All checks passed** (one initial test-assertion
arithmetic error was caught and fixed — 5/8 checklist items true is 63%
coverage, not 50% — the implementation was correct on the first run;
only the test's hand-computed expectation needed correcting), including:

- Thesis/findings/red-flags all return their documented honest-empty
  defaults, with genuinely no conclusion field anywhere.
- `RiskFinding` construction correctly rejects an empty evidence array
  (evidence-backed only, enforced structurally).
- `aggregateEvidence` correctly dedupes identical sources/evidence
  supplied from two different lists.
- `computeDecisionConfidence` produces correct, real values for both a
  partially-populated and a fully-empty checklist, correctly omitting
  (not zeroing) `dataFreshnessDays` when there's no evidence.
- `deriveDecisionReadiness` leaves all 5 levels honestly unassessed with
  a real, specific rationale.
- `aggregateRecommendations`/`sortRecommendationsByPriority` correctly
  dedupe and order.
- `buildDecisionProfile` produces a valid profile with correct
  `initial_discovery` refresh metadata, honest open-question gap
  statements, and the always-true scoring-placeholder limitation.
- `isDecisionStale`/`collectStaleDecisions`/the refresh engine all behave
  correctly.
- `mergeDecisionProfile` unions strengths without duplicating and
  correctly recomputes `confidenceSummary` from the merged whole.
- `buildInvestmentMemo`/`buildDueDiligenceReport`/`buildExecutiveSummary`
  correctly reshape a profile — the diligence report correctly grouped a
  `"financial"`-category finding into its `financial` section and left
  `legal` empty.
- `synthesizeDecision` calls only the five permitted platforms and
  returns a schema-valid result honestly reflecting this environment's
  lack of configured search-provider credentials.
- `createStore()` defaults to `MemoryDecisionStore` and round-trips a
  profile; `SupabaseDecisionStore` honestly throws.

**Not verified:** a real multi-run accumulation scenario against a
persisted (non-memory) store; and decision synthesis against real,
richly-populated upstream platform data, since no real search-provider
credentials exist in this environment.

---

## Future Consumers

Every one of these is expected to consume `lib/decision/`'s public
barrel — never re-implement business analysis itself:

- **Investor Reports** — consumes `DecisionProfile` directly, or
  `buildInvestmentMemo()`'s reshaped output. Partially satisfied: a
  founder's Investment Memo (below) is already investor-report-shaped
  output, reachable today at `/projects/{id}/memo`.
- **Due Diligence** — ✅ delivered (Milestone 31):
  `buildDueDiligenceReport()` is now called by
  `app/projects/[id]/diligence/page.tsx`.
- **Investment Memo** — ✅ delivered (Milestone 31):
  `buildInvestmentMemo()` is now called by
  `app/projects/[id]/memo/page.tsx`.
- **Executive Summary** — ✅ delivered (Milestone 31):
  `buildExecutiveSummary()` is now called by
  `app/projects/[id]/executive-summary/page.tsx`.
- **Funding Readiness** — still unwired; consumes
  `DecisionProfile.decisionReadiness.funding`
  once a real assessment exists.
- **Acquisition Review** — consumes `DecisionProfile.criticalRisks` and
  `businessSummary` for risk-weighted framing.
- **Bank Lending Assessment** — consumes `decisionReadiness.operational`/
  `.investment` and `confidenceSummary` for a lender's own risk framing.
- **Accelerator Evaluation** — consumes `executiveSummary`-shaped output
  for fast triage across many applicants.

### Also on the roadmap

- **Real thesis/finding/red-flag generation.** Every `derive*()` function
  in `thesis/`, `findings/`, `redflags/` is a real, permanent contract; a
  future (likely AI-assisted) implementation replaces only the body.
- **Real readiness assessment**, once real scoring dimensions exist
  across the platforms beneath this one.
- **Real storage backends**, `SupabaseDecisionStore` first.
- **Consolidate the small utility duplication** (`dedupeByKey`,
  `urlDedupeKey`) that `ARCHITECTURE_REVIEW.md` flagged as Technical Debt
  #1 — this platform adds a fifth copy of each, exactly the pattern that
  review recommended addressing before it compounds further.
