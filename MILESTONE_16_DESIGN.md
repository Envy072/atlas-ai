# Atlas AI — Milestone 16 Design Specification

**Competitor Intelligence Depth: Wiring the Knowledge Platform That Was Never Wired**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete design specification for Milestone 16,
written for review before any implementation begins.

Milestones 1–15 are complete and frozen. This milestone touches only
`lib/competitors/` (additive) and `lib/decision/` (additive — Decision
consuming a richer input, not being redesigned). It does not touch
`lib/pipeline/`, `lib/analysis-session/`, `lib/verification/`, or any
`app/`/`components/` file.

---

## Pre-Design Verification

Every claim below is grounded in a direct read of the current codebase,
not memory or `COMPETITOR_PLATFORM.md`'s own prose.

**Read in full:** `COMPETITOR_PLATFORM.md`, `PRODUCT_BACKLOG.md`,
`ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`.

**Read directly, file by file:** `lib/competitors/index.ts`,
`lib/competitors/schemas/{company,enums,discovery,pricing,funding}.schema.ts`,
`lib/competitors/discovery/{competitorDiscovery,candidateExtraction}.ts`,
`lib/competitors/knowledge/{companyProfileBuilder,profileMerger}.ts`,
`lib/competitors/matcher/entityMatcher.ts`,
`lib/competitors/comparison/comparisonEngine.ts`,
`lib/competitors/scoring/scoringDimensions.ts`,
`lib/competitors/refresh/refreshPolicy.ts`,
`lib/competitors/storage/createStore.ts`,
`lib/decision/engine/{decisionEngine,decisionProfileBuilder}.ts`,
`lib/decision/confidence/decisionConfidence.ts`,
`lib/decision/evidence/evidenceAggregator.ts`,
`lib/pipeline/stages/competitors.ts`,
`lib/research/providers/{crunchbaseProvider,registry}.ts`,
`lib/analysis-session/storage/defaultStore.ts` (the M12 shared-singleton
fix, reused as a direct precedent below), and — via grep, not assumption
— every call site of `discoverCompetitors`/`buildCompanyProfile`/
`mergeCompanyProfile`/`matchCompanyName` in the entire repository.

### The central finding

**`lib/competitors/`'s own "core principle" — the one `COMPETITOR_PLATFORM.md`
states first — has never actually run.** That document's own words:

> This platform must not depend on a single analysis — a company's
> profile persists and improves across many discovery runs... rather
> than being recomputed from scratch every time someone asks.

Grep-verified: **zero** call sites of `buildCompanyProfile`,
`mergeCompanyProfile`, `matchCompanyName`, or `lib/competitors`' own
`createStore()` exist anywhere outside `lib/competitors/` itself. The
only real caller of `discoverCompetitors()` in the entire application —
`lib/decision/engine/decisionEngine.ts`'s `synthesizeDecision()` — reads
`competitorDiscovery.candidates.map(c => c.sources)` /`.evidence` directly
and discards everything else. It never matches a candidate against
existing knowledge, never builds or merges a `CompanyProfile`, never
persists anything. `lib/market`, `lib/financial`, and `lib/business` each
independently call `discoverCompetitors()` again too (confirmed via
grep) and use only `.candidates.length` — a bare count.

**Concretely, today:** every single analysis re-discovers competitors
from zero accumulated knowledge, "HubSpot" mentioned in one analysis and
"HubSpot" mentioned in a second, unrelated analysis create two entirely
independent, un-linked, un-persisted candidate records, and none of
`CompanyProfile`'s own real fields (`pricing`, `funding`, `features`,
`strengths`, `weaknesses`, `category`) are ever populated by anything —
`companyProfileBuilder.ts`'s own `buildCompanyProfile()` doesn't even
accept them as inputs today.

This reframes what "Competitor Intelligence Depth" concretely means for
this milestone: **the depth already exists, on disk, unused, since
Milestone 6.** The highest-leverage, lowest-risk, zero-fabrication-risk
work is finishing the wiring `COMPETITOR_PLATFORM.md` explicitly left as
"the caller's job" — not inventing new extraction logic.

### Stale documentation identified

- **`COMPETITOR_PLATFORM.md`'s "Status: not wired into the application"
  line is now partially stale.** Milestone 14 did wire `discoverCompetitors()`
  into the live pipeline — but only in the shallow sense (raw candidates
  feed evidence aggregation). The document's own "core principle"
  (accumulation via matching/merging/storage) remains exactly as unwired
  as it was at Milestone 6. This document's "Future Roadmap" section
  ("Wire into the application... Nothing calls `lib/competitors/` yet")
  is the item this milestone actually closes — worth updating once this
  milestone ships, not now (design phase).
- **`ARCHITECTURE.md`** — already known-stale (`ARCHITECTURE_REVIEW.md`'s
  own Technical Debt #2), confirmed again here; nothing new to add.
- **`ARCHITECTURE_REVIEW.md`** — still accurate for what it actually
  checked (Check 3's "cumulative consumption" flow, Check 1's DAG) — not
  stale, just silent on the specific gap this milestone found, since
  auditing *usage depth* of an already-"clean" call graph wasn't Check
  3's question.

### A second real finding: redundant discovery calls

`discoverCompetitors()` runs **four independent times** per single
analysis today — once each from Market, Financial, Business, and
Decision's own `synthesizeDecision()` — each issuing its own fresh
`runResearch()` call with zero shared knowledge between them. This is a
real, measured inefficiency. Fixing *who calls* `discoverCompetitors()`
would mean touching Market/Financial/Business's own established call
patterns (verified sound in `ARCHITECTURE_REVIEW.md` Check 3) — out of
this milestone's authority ("Competitor Intelligence must remain a
knowledge platform," not a cross-platform orchestration change). Recorded
as Design Debt (Section 17), not fixed here.

### Crunchbase provider is still 100% architecture-only

`lib/research/providers/crunchbaseProvider.ts` returns
`buildNotImplementedResult()` unconditionally — confirmed by direct read.
Only `tavily`/`brave` are real providers today. This means `CompanyProfile.funding`
cannot be honestly populated from a real, structured source yet, at any
credential level — not a gap this milestone can close, only one it can
avoid pretending isn't there.

### A third finding, added on revision: the gap is systemic, not competitors-specific

Re-verified by direct read, prompted by this revision's own requirement
to explain *why* the existing architecture was never wired in. It isn't
just Competitors:

- `lib/market/knowledge/marketDiscovery.ts`'s `discoverMarket()` calls
  only `runResearch()`, `discoverCompetitors()`, `classifyIndustry()`,
  and `buildMarketProfile()` — never a match/merge/storage function.
  Grep-confirmed: **zero** callers of `lib/market`'s own `createStore()`
  exist anywhere outside `lib/market/storage/` itself.
- `lib/financial/knowledge/financialDiscovery.ts` calls only
  `buildFinancialProfile()` — same pattern, no match/merge/store call.
- `lib/business/knowledge/businessDiscovery.ts` calls only
  `buildBusinessProfile()` — same pattern.

**Every one of the four downstream knowledge platforms (Competitors,
Market, Financial, Business) built a complete accumulate-over-time
storage layer, and none of the four ever wired it into their own
per-request `discover*()` flow.** This is not a mistake specific to
Competitors or specific to whoever wrote `decisionEngine.ts` — it's a
repeated, systemic pattern across every platform in this lineage. See
"Why Existing Architecture Wasn't Used" below for what this means for
this milestone's scope.

---

## Wiring vs Intelligence

Two different kinds of "improvement" are possible here, and this
milestone deliberately does only one of them.

**Structural improvement — what this milestone does:**
- Connects already-real, already-correct code
  (`matchCompanyName`/`buildCompanyProfile`/`mergeCompanyProfile`/
  `CompetitorKnowledgeStore`) into the one live execution path that
  currently bypasses all four.
- Makes competitor identity *persist* — the same company mentioned in
  two analyses resolves to one accumulating record instead of two
  disconnected ones.
- Makes `DecisionProfile` carry real `CompanyProfile` records instead of
  a bare count.
- Every one of these is a wiring fix: zero new judgment, zero new
  extraction, zero new inference is introduced anywhere.

**Intelligence improvement — what this milestone explicitly does not
do:**
- Does not make Atlas AI *know more* about any individual company than
  it already honestly knows from a search snippet.
- Does not classify a competitor's `category` (direct/indirect/adjacent/
  aspirational).
- Does not populate `pricing`, `funding`, `features`, `strengths`,
  `weaknesses`, or any other content field `PRODUCT_BACKLOG.md` names.
- Does not add a new data source, a new extraction heuristic, or any
  LLM-assisted reasoning about a competitor.

**Why this split matters:** a milestone titled "Competitor Intelligence
Depth" could easily be read as a mandate to make the *content* deeper.
Pre-Design Verification found that the actual, highest-leverage,
lowest-risk problem is structural — the depth was already designed and
built (Milestone 6) and simply never connected. Fixing the wiring is
zero-fabrication-risk and immediately valuable (accumulation starts
working, evidence aggregation gets fuller, confidence becomes measurably
more accurate — Sections 6/7). Fabricating intelligence to *look* deeper
— guessing pricing from a snippet, inventing a category, manufacturing a
strength — would actively work against `PRODUCT_BACKLOG.md`'s own
Trust & Evidence complaint this whole project has spent three milestones
(11–13) building infrastructure to solve. Structural depth is real depth;
invented content is not, no matter how deep it reads.

## Why Existing Architecture Wasn't Used

Every claim below is backed by a specific file read during Pre-Design
Verification, not speculation about intent.

**`buildCompanyProfile()`, `mergeCompanyProfile()`,
`matchCompanyName()`, `createStore()` were never wired in because no
milestone's own scope ever included wiring them in — not because they're
broken, hard to use, or were deliberately deferred.**

1. **`COMPETITOR_PLATFORM.md` (Milestone 6) explicitly assigned this work
   to "the caller", and no later milestone picked it up.** Its own words
   (Discovery Flow section): *"Turning an accepted DiscoveredCompetitor
   into a persisted CompanyProfile is the caller's job (via matcher +
   knowledge, see Knowledge Lifecycle) — discovery itself never touches
   storage."* This was a deliberate, documented design choice at M6 —
   not an oversight — but it created an obligation for whichever future
   milestone became "the caller." That milestone (M10, Decision
   Intelligence) never re-read this specific requirement when it
   integrated `lib/competitors`.

2. **`decisionEngine.ts`'s own header comment shows exactly what M10 was
   told to do, and it was satisfied at face value.** Direct quote from
   the file (`lib/decision/engine/decisionEngine.ts`, lines 26–34): *"Per
   this milestone's explicit rule ('Decision Intelligence consumes ONLY:
   Research Platform, Competitor Platform, Market Platform, Financial
   Platform, Business Intelligence Platform. Never call providers. Never
   duplicate logic. Never recompute lower-layer knowledge.'), this file
   calls only runResearch() (lib/research), discoverCompetitors()
   (lib/competitors), discoverMarket() (lib/market),
   discoverFinancials() (lib/financial), and discoverBusiness()
   (lib/business)."* This comment treats `discoverCompetitors()` as
   *the* representative entry point for the whole Competitor Platform —
   symmetric with `discoverMarket()`/`discoverFinancials()`/
   `discoverBusiness()`, each of which genuinely is its own platform's
   single top-level synthesis call. Calling `discoverCompetitors()` and
   using its result satisfied M10's own literal instruction ("consume
   Competitor Platform... never duplicate logic") — the instruction
   itself never said "also call the matcher and the store," and neither
   did anything else M10's author would have had in front of them.

3. **The gap is systemic, not a one-off miss (see Pre-Design
   Verification's third finding).** `discoverMarket()`,
   `discoverFinancials()`, and `discoverBusiness()` all have the
   *identical* shape: build a fresh profile, never match, never merge,
   never persist. If this were a mistake specific to one integration,
   only one platform would show it. All four do. The real explanation
   isn't "M10 made an error" — it's that **no milestone in this
   project's history was ever scoped as "wire a knowledge platform's own
   accumulation layer into its live discovery flow."** Milestones 6–9
   each built a complete storage/matching layer and explicitly scoped
   wiring it in as future work (`COMPETITOR_PLATFORM.md`'s own "Future
   Roadmap": *"Wire into the application. Nothing calls
   lib/competitors/ yet."*). Milestone 10 was scoped as "synthesize a
   decision from what the platforms below already expose," which it did
   correctly, using the exact entry points those platforms named as
   their own public discovery interface. Nobody's scope, at any point,
   was "close the loop." This milestone is the first one whose scope
   explicitly is.

4. **This was a documentation-to-implementation handoff gap, not an
   architecture flaw.** The matcher/knowledge/storage code itself is
   correct (`COMPETITOR_PLATFORM.md`'s own Verification section: 20/20
   checks passed at M6, still true today — nothing about the code was
   ever broken). The gap is that "the caller's job" was written down in
   one milestone's document and never re-surfaced as an explicit
   requirement for the milestone that became that caller.

---

## Call Graph

### Current execution path (verified, not assumed)

```
synthesizeDecision(request)
  │
  ├─ runResearch(...)                                                    [lib/research]
  ├─ discoverCompetitors({ startupIdea })                                 [lib/competitors]
  │     → runResearch({ topic: "companies competing with: <idea>" })
  │     → groupByCandidateName(sources, evidence)     (discovery-local, not exported)
  │     → CompetitorDiscoveryResult { candidates: DiscoveredCompetitor[] }
  │
  │     ✕  matchCompanyName()        — never called
  │     ✕  buildCompanyProfile()     — never called
  │     ✕  mergeCompanyProfile()     — never called
  │     ✕  CompetitorKnowledgeStore  — never instantiated, never read, never written
  │
  ├─ discoverMarket(...) / discoverFinancials(...) / discoverBusiness(...) [same shape,
  │                                                                          same gap —
  │                                                                          Pre-Design
  │                                                                          Verification]
  │
  ├─ competitorDiscovery.candidates.map(c => c.sources / c.evidence)      [decisionEngine.ts, inline]
  ├─ aggregateEvidence(...)
  └─ buildDecisionProfile({ ..., decisionContext: { competitorCount: candidates.length } })
        │
        ▼
  DecisionProfile — competitor knowledge enters ONLY as a bare count and
  this run's own raw, unpersisted source/evidence list. No competitor
  identity survives past this single function call.
```

**Where competitor knowledge enters today:** at exactly one point —
`competitorCount: candidates.length` on `decisionContext`. Nothing else.

### Proposed execution path

```
synthesizeDecision(request)
  │
  ├─ runResearch(...)                                                    [unchanged]
  ├─ discoverCompetitors({ startupIdea })                                 [unchanged — still
  │     → CompetitorDiscoveryResult { candidates: DiscoveredCompetitor[] }  pure, storage-free]
  │
  ├─ resolveCompetitorKnowledge(candidates, defaultCompetitorStore)        NEW — see below
  │     → CompanyProfile[]   (real, matched-or-built, merged, persisted)
  │
  ├─ discoverMarket(...) / discoverFinancials(...) / discoverBusiness(...) [unchanged]
  │
  ├─ aggregateEvidence([..., ...keyCompetitors.map(c => c.sources)],
  │                     [..., ...keyCompetitors.map(c => c.evidence)])     EXTENDED
  └─ buildDecisionProfile({ ..., keyCompetitors,
                             decisionContext: { competitorCount: keyCompetitors.length } })
        │
        ▼
  DecisionProfile.keyCompetitors: CompanyProfile[]  — competitor knowledge
  enters as real, identity-resolved, accumulating records.
```

**Where competitor knowledge enters after this milestone:** at one new,
explicit point — `resolveCompetitorKnowledge()`'s return value, assigned
directly to `DecisionProfile.keyCompetitors`. Exactly one new edge is
added to the call graph; nothing existing is removed or rerouted.

### Why direct, ad hoc wiring is insufficient

The simplest possible fix would be inlining the match-or-build-or-merge
decision directly into `decisionEngine.ts`, as a local loop, calling the
four existing functions without introducing any new named function. This
was seriously considered and rejected — not because it's inconvenient,
but because it's the wrong place for the logic it requires:

1. **A correctness property that needs its own function to be testable
   in isolation.** Resolving one discovery batch correctly requires
   checking each candidate against *both* the store's existing contents
   *and* every profile already resolved earlier in the same batch — a
   discovery run can return "HubSpot" and "Hub Spot" as two separate
   grouped candidates (`candidateExtraction.ts`'s own grouping is a
   simpler name+domain heuristic than the full matcher), and only the
   latter check catches that they're the same company within one run.
   Get this wrong and deduplication silently fails. This is a real
   algorithm with a real correctness property (Success Metrics: "two
   near-duplicate candidates in one batch resolve to one profile") that
   deserves a unit directly testable without running the entire decision
   pipeline (research + market + financial + business all
   included/mocked) just to reach it.
2. **It's a competitor-identity judgment, which is `lib/competitors`'s
   domain, not `lib/decision`'s.** Deciding whether "Hub Spot" and
   "HubSpot Inc." are the same entity is exactly the kind of "lower-layer
   knowledge" `decisionEngine.ts`'s own header comment says must never be
   recomputed in Decision. Writing the match-or-build branch inline in
   `decisionEngine.ts` would put that judgment in the wrong layer, even
   though every function it calls would still be a public-barrel import
   — the violation is architectural (which layer owns the decision), not
   an import-path violation.
3. **The identical gap exists in three other platforms (Market,
   Financial, Business — Pre-Design Verification).** This milestone
   doesn't fix those, but placing the resolution logic inside
   `lib/competitors` (where the pattern conceptually belongs) means a
   future milestone fixing Market's or Financial's own version of this
   gap has a real, working template to follow inside that platform's own
   `knowledge/` folder — not logic buried inside `lib/decision` that
   would need to be found and generalized first.

**Conclusion: a new orchestration function is necessary, not a
convenience.** It owns a genuine correctness property (intra-batch plus
cross-run deduplication) that direct/naive wiring — calling the four
existing functions in the most straightforward order, with no dedicated
name or isolated test surface — would not reliably provide. See the
re-run Complexity Review below for the final challenge against it.

---

## 1. Purpose

Fix the one thing actually broken: `lib/competitors/`'s own knowledge-
accumulation pipeline — entity matching, profile building/merging,
persistent storage — has real, correct, already-built code that has
never been called by anything. This milestone wires it in, and lets
Decision Intelligence consume real, accumulating `CompanyProfile` records
instead of a discarded pile of per-run candidates.

## 2. Product Vision

> A competitor Atlas AI has already researched should be *known*, not
> re-discovered from nothing on every unrelated analysis.

This is the platform's own founding premise (`COMPETITOR_PLATFORM.md`,
Milestone 6), unrealized until this milestone. Depth, here, does not mean
"generate more text about each competitor" — it means "actually use the
knowledge model already built," which is both more honest and more
valuable than heuristic text-mining a search snippet for facts it
doesn't reliably contain.

## 3. User Questions

The real questions a founder — or the VC-analyst posture Atlas AI itself
takes — asks about competitors, mapped honestly to what this milestone
answers:

| Question | Answered after this milestone? |
|---|---|
| Who are the real competitors? | Yes — real, evidence-backed candidate names, now persisted and deduplicated across runs (not re-guessed every time). |
| Why are they competitors? | Partially — they were returned by a competitor-framed research query; **category** (direct/indirect/adjacent/aspirational) stays an honest unknown (Section 8) — no reliable signal exists yet to classify it. |
| What evidence supports that? | Yes — every candidate carries real `Source`/`Evidence`, now accumulated across every run that's ever mentioned the same company. |
| What are their strengths/weaknesses? | No — `CompanyProfile.strengths`/`.weaknesses` stay empty; nothing in this milestone extracts them (Section 8/14). |
| Where is the opportunity? | Not from this milestone directly — `keyCompetitors` gives Decision Intelligence the raw material; a real opportunity synthesis is `findings/findingBuilder.ts`'s job (Milestone 10, still its own placeholder), untouched here. |
| What is uncertain? | Everything not listed above, named explicitly (Section 8) — not silently absent. |

## 4. Intelligence Goals

1. Every competitor candidate becomes a real, persisted `CompanyProfile`
   — not a discarded per-run record.
2. The same company, mentioned across multiple analyses, resolves to
   *one* accumulating profile — richer sources/evidence over time, not a
   fresh start each time.
3. `DecisionProfile` carries real competitor records, not a bare count.
4. Every field that's populated is evidence-traceable; every field that
   isn't stays honestly absent.
5. No fabricated categorization, scoring, pricing, or sentiment — ever.

## 5. Competitor Discovery Strategy

**Discovery itself does not change.** `discoverCompetitors()` stays
exactly as built — pure, storage-free, calling only `runResearch()`. See
"Call Graph" above for the full current/proposed execution paths and the
proof that a dedicated resolution step (not ad hoc inline wiring) is
required. This section covers the resolution step's own internal
behavior, not repeated here.

`resolveCompetitorKnowledge(candidates, store?)`'s one piece of real
logic: each candidate is matched against **the store's current contents
PLUS every profile already resolved earlier in the same batch** — so two
candidates in one discovery run that are the same company (a grouping
miss `candidateExtraction.ts`'s own simpler name+domain grouping didn't
catch) resolve through the exact same matcher as a cross-run duplicate
would, with no special-cased branch for "same batch" vs. "earlier run."
Matched candidates go through `mergeCompanyProfile()`; unmatched ones
through `buildCompanyProfile()`; every result is written back via
`store.upsert()` before the next candidate is checked, so later
candidates in the same batch see it. No new matching logic and no new
profile-building logic are introduced anywhere — every judgment call
still happens inside the three already-existing functions.

## 6. Evidence Strategy

Every `CompanyProfile.sources`/`.evidence` field is a direct pass-through
from `DiscoveredCompetitor.sources`/`.evidence` (candidate) or a real
URL-deduplicated union (merge) — unchanged logic, first time actually
exercised end to end. Once `resolveCompetitorKnowledge()` feeds real
`CompanyProfile[]` into `DecisionProfile.keyCompetitors` (Section 9),
Decision's own `aggregateEvidence()` call is updated to fold in
`keyCompetitors[].sources`/`.evidence` too — meaning `DecisionProfile.sources`/
`.evidence` (and therefore `VerificationSummary.sources`) now reflect
*accumulated* competitor evidence across every prior run that resolved
into the same profiles, not just this run's raw candidates. This is a
direct, mechanical evidence-quality improvement, not a new evidence
source — the evidence already existed, aggregation just wasn't reaching
it.

## 7. Confidence Strategy

`CompanyProfile.confidence` is unchanged — the average of grouped source
confidences (`averageConfidence()`, already real, already evidence-
derived). `DecisionConfidence`'s own coverage checklist
(`lib/decision/confidence/decisionConfidence.ts`) gains one new,
honestly-computed boolean: **`hasCompetitorProfiles`** (`keyCompetitors.length > 0`),
joining the existing eight (`CoverageChecklist` grows from 8 to 9 fields,
`CHECKLIST_SIZE` updated to match). This directly ties richer competitor
intelligence to a measurable, mechanical confidence improvement — not a
vague claim that confidence "should" go up, an actual additional signal
`computeCoverage()` already knows how to fold in.

## 8. Unknowns Strategy

Named explicitly, not silently absent — every one of these stays
genuinely unset by this milestone, and is listed here specifically so a
future reader (or reviewer) never mistakes "not yet built" for
"forgotten":

- **`category`** (direct/indirect/adjacent/aspirational) — no reliable
  signal exists to classify this from a search snippet alone.
  `buildCompanyProfile()` doesn't even accept it as an input yet, and
  this milestone doesn't add one. A future, deliberate classification
  step (real heuristic or LLM-assisted, explicitly reviewed for
  fabrication risk) is a named future need, not built now.
- **`pricing`, `funding`, `features`, `technology`, `strengths`,
  `weaknesses`, `opportunities`, `threats`, `description`, `targetMarket`,
  `businessModel`** — every one of these requires either a genuinely
  reliable structured data source (Crunchbase, confirmed 100%
  architecture-only — Pre-Design Verification) or a real content-
  extraction step from evidence text, neither of which exists today.
  Attempting a naive heuristic extractor here (regex-guessing a price or
  a "strength" out of a search snippet) would produce low-confidence,
  unreliable output dressed up as real intelligence — exactly what
  "never fabricate certainty" rules out. Left honestly empty.
- **`aliases` beyond what merging discovers** — grows only through real
  matched-duplicate resolution (Section 5), never guessed.

`unverifiedStatements`/`decisionLimitations` (Verification/Decision's own
existing honest-gap ledgers, unchanged) are the correct place these
unknowns already surface today, and continue to.

## 9. Decision Relationship

Decision Intelligence continues owning synthesis — this milestone gives
it a richer *input*, never a new responsibility. Concretely:

- **`DecisionProfileSchema` gains one new, additive field:
  `keyCompetitors: CompanyProfile[]`** — reusing `CompanyProfileSchema`
  verbatim, imported from `lib/competitors`'s public barrel (never
  redefined), exactly the "one schema per shape, reused everywhere"
  discipline every prior milestone held.
- **`buildDecisionProfile()`'s `BuildDecisionProfileInput` gains an
  optional `keyCompetitors?: CompanyProfile[]`** (default `[]`), placed
  onto the returned profile unchanged — no new derivation logic inside
  `lib/decision` beyond the one new checklist boolean (Section 7).
- **`synthesizeDecision()` calls `resolveCompetitorKnowledge()`** right
  after `discoverCompetitors()`, passes the result into
  `buildDecisionProfile()`, and includes `keyCompetitors[].sources`/
  `.evidence` in its existing `aggregateEvidence()` call (Section 6).
- **`decisionContext.competitorCount`** changes from the raw, pre-dedup
  `competitorDiscovery.candidates.length` to the resolved, deduplicated
  `keyCompetitors.length` — a more honest count (intra-run duplicates
  collapsed via the same matcher, Section 5), not a new metric.
- Decision never matches, builds, merges, or scores a company itself —
  `resolveCompetitorKnowledge()` lives in `lib/competitors/`, imported
  from its public barrel, exactly like every other platform Decision
  already consumes.

## 10. Verification Relationship

Zero changes to `lib/verification/`. `VerificationSummary.sources`/
`.sourceBreakdown`/`.verificationCounts` are already pure derivations of
`DecisionProfile.sources`/`.evidence` — since Section 6 makes those two
fields richer (accumulated competitor evidence, not just this run's raw
candidates), `VerificationSummary` automatically reflects more sources
and a fuller trust picture with no code change at all. This is exactly
the "automatic enrichment" property `VERIFICATION.md` and
`MILESTONE_14_DESIGN.md` already predicted for this boundary — confirmed
real here, not just theoretical. `keyCompetitors` itself is **not**
separately exposed through `VerificationSummary` in this milestone
(Non-Goal) — that's a future Dashboard/Reports concern, not this one's.

## 11. Pipeline Relationship

**Nothing changes.** `lib/pipeline/stages/competitors.ts` calls
`discoverCompetitors()` and only `discoverCompetitors()` — unchanged,
since that function's own signature and behavior are untouched by this
milestone. `resolveCompetitorKnowledge()` is called from
`lib/decision/engine/decisionEngine.ts`, inside the existing `decision`
stage's own work — not a new pipeline stage, not a change to stage
count, ordering, retry, or cancellation semantics. Pipeline remains the
execution owner, entirely unaware this milestone exists.

## 12. Data Flow

```
synthesizeDecision(request)
  │
  ├─ runResearch(...)                                          [unchanged]
  ├─ discoverCompetitors({ startupIdea })                       [unchanged]
  │     → CompetitorDiscoveryResult { candidates: DiscoveredCompetitor[] }
  │           │
  │           ▼
  │     resolveCompetitorKnowledge(candidates, defaultCompetitorStore)   NEW
  │           │  matches/builds/merges/persists via lib/competitors'
  │           │  own existing matcher + knowledge + storage
  │           ▼
  │     keyCompetitors: CompanyProfile[]                         REAL, ACCUMULATING
  │
  ├─ discoverMarket(...) / discoverFinancials(...) / discoverBusiness(...)  [unchanged]
  │
  ├─ aggregateEvidence([...,  ...keyCompetitors.map(c => c.sources)],
  │                     [...,  ...keyCompetitors.map(c => c.evidence)])     EXTENDED
  │
  └─ buildDecisionProfile({ ..., keyCompetitors, sources, evidence })       EXTENDED
        │
        ▼
  DecisionProfile { ..., keyCompetitors: CompanyProfile[] }
        │
        ▼  (unchanged — Milestone 14's existing chain)
  AnalysisSession.result.profile → buildVerificationSummaryFromSession → VerificationSummary
```

## 13. Information Flow

For a founder, the honest information trail this milestone establishes:
**a claim about a competitor → the `CompanyProfile` it came from → the
`Evidence`/`Source` backing it → the `confidence` that source carried.**
This chain already existed at the `Evidence`/`Source` level (Milestone 13
already surfaces it); this milestone is what makes the *middle* link —
"which persisted, accumulating company record does this evidence belong
to" — real for the first time, instead of the evidence arriving
disconnected from any durable competitor identity.

## 14. Non-Goals

- Does not build a real Crunchbase integration — the provider stays
  architecture-only (Pre-Design Verification); funding stays empty.
- Does not add heuristic or LLM-based extraction of pricing, features,
  strengths, weaknesses, reviews, or "why customers choose/leave" —
  every one of these `PRODUCT_BACKLOG.md` items requires either a real
  structured data source or a deliberately-designed, separately-reviewed
  extraction step; neither exists, and fabricating either now would
  violate "never fabricate certainty."
- Does not classify `category` (direct/indirect/adjacent/aspirational).
- Does not touch `lib/competitors/scoring/` or `lib/competitors/comparison/`
  — both remain exactly as architecture-only as before; `DecisionProfile`
  does not gain a score or a comparison matrix this milestone (a
  placeholder-score reaching the dashboard would misrepresent itself as
  real assessment).
- Does not change who calls `discoverCompetitors()` — Market/Financial/
  Business's own redundant calls are unchanged (Design Debt, Section 17).
- Does not add a refresh-scheduling job (cron/background worker) — no
  scheduler exists anywhere in this app; `refresh/refreshEngine.ts`'s
  functions remain unwired, exactly as before.
- Does not touch `lib/pipeline/`, `lib/analysis-session/`,
  `lib/verification/`, any `app/`/`components/` file, or Decision's own
  `findings/`/`redflags/` placeholder derivation.
- Does not add a real (non-memory) storage backend — `resolveCompetitorKnowledge()`
  defaults to `MemoryCompetitorStore`, meaning accumulation survives
  within one running process but not a restart (Design Debt, Section 17).

## 15. Risks

- **Accumulation doesn't survive a process restart.** `MemoryCompetitorStore`
  resets on every dev-server reload / deploy. The wiring is real; the
  persistence is not durable yet. Named explicitly so this isn't mistaken
  for a bug — it's the same "only real backend is memory" state every
  other platform's storage layer already carries (`ARCHITECTURE_REVIEW.md`
  Check 5).
- **Zero observable effect in this environment today.** With no search-
  provider credentials configured, `discoverCompetitors()` returns
  `candidates: []`, so `resolveCompetitorKnowledge()` processes nothing
  and `keyCompetitors` stays `[]` — correct, honest, and *silent*. This
  milestone's value is fully realized only once real search-provider
  credentials exist; verification (Section "Verification Strategy" of
  the implementation) must therefore also exercise a hand-seeded
  candidate batch, not only the live (empty) environment, to prove the
  matching/merge/persist logic actually works.
- **Matching threshold false positives/negatives.** `matchCompanyName`'s
  80-point Jaccard/normalized-name threshold is unchanged, pre-existing,
  already verified (the HubSpot/Hub Spot/HubSpot Inc. case,
  `COMPETITOR_PLATFORM.md`'s own Verification section) — this milestone
  doesn't change the threshold or the algorithm, only starts actually
  calling it.

## 16. Success Metrics

- `resolveCompetitorKnowledge()` exists, is exported from `lib/competitors`'s
  public barrel, and is the only new function this milestone adds to
  that platform.
- A hand-seeded batch of candidates (including a deliberate near-
  duplicate, e.g. "HubSpot"/"Hub Spot") resolves to the correct number of
  distinct `CompanyProfile`s, verified against a real store instance —
  not just asserted.
- A second `resolveCompetitorKnowledge()` call against the same store,
  with an overlapping candidate, correctly merges into the existing
  profile (accumulated `sources`/`evidence` grows, `aliases` grows) —
  the "improves over time" claim demonstrated, not just documented.
- `DecisionProfile.keyCompetitors` is populated end to end from a real
  `synthesizeDecision()` call (using the hand-seeded path, given the live
  environment's own empty discovery).
- `DecisionConfidence.coverage`'s new `hasCompetitorProfiles` signal
  measurably changes `coverage` between a zero-competitor and a
  populated-competitor profile.
- `git status --short` touches only `lib/competitors/` and `lib/decision/`
  — zero frozen `lib/pipeline`/`lib/analysis-session`/`lib/verification`/
  `app`/`components` files.

## 17. Design Debt

Named explicitly, not fixed this milestone:

1. **Four redundant `discoverCompetitors()` calls per analysis**
   (Market/Financial/Business/Decision, Pre-Design Verification) — fixing
   this means touching three other platforms' own established call
   patterns, out of this milestone's scope.
2. **`MemoryCompetitorStore` is the only real backend** — accumulation is
   real but not durable across a process restart.
3. **`resolveCompetitorKnowledge()`'s matching pass is O(candidates ×
   known profiles)** — a linear scan per candidate against every stored
   profile. Negligible today (the live environment returns zero
   candidates); would matter once real usage accumulates hundreds of
   companies. An indexed normalized-name lookup is the natural fix,
   deliberately not built now (Complexity Review) since no real data
   volume exists yet to justify it.
4. **`category` remains permanently unset** until a deliberately-designed
   classification step is scoped as its own piece of work.

## 18. Product Readiness

Honest assessment, not an inflated one: this milestone closes the
*structural* gap (`PRODUCT_BACKLOG.md`'s underlying "the platform doesn't
remember what it learns" problem) but does **not** close the *content*
gap the backlog's Competitor Intelligence section names most visibly —
"pricing comparison," "features comparison," "strengths and weaknesses
with evidence," "why customers choose/leave." Those require either a
real structured provider (Crunchbase) or a deliberate extraction layer,
neither of which exists. **What ships after this milestone:** competitor
identity, evidence, and confidence that genuinely accumulate and improve
across analyses — a real, durable-within-process foundation the backlog's
remaining asks can be built on, not a finished answer to them.

## 19. Future Growth

How Milestone 17 (Market Intelligence Depth) and Milestone 18 (Financial
Intelligence Depth) build on this work, per the approved roadmap:

- **Milestone 17 (Market).** `lib/market`'s own `discoverMarket()` already
  calls `discoverCompetitors()` (Pre-Design Verification) — once a
  similar `resolveMarketKnowledge()`-shaped pattern exists for Market's
  own knowledge model, it can look up the *same* `CompanyProfile` records
  this milestone starts persisting (via `CompetitorKnowledgeStore.list()`/
  `findByName`) rather than re-discovering competitor identity a second
  time — exactly the reuse `COMPETITOR_PLATFORM.md`'s own Future Roadmap
  named ("Market Intelligence... reuses `CompanyProfile`/
  `CompetitorKnowledgeStore` directly").
- **Milestone 18 (Financial).** `funding`/`pricing` on `CompanyProfile`
  are already the right shape for Financial Intelligence Depth to
  populate once a real structured source exists — this milestone doesn't
  populate them, but it does mean Financial's own future enrichment
  writes to the *same*, already-accumulating profile record instead of a
  disconnected one.
- **What does not need to change:** `DecisionProfileSchema.keyCompetitors`'s
  shape (already `CompanyProfile[]`, already reused verbatim) absorbs
  richer `CompanyProfile` content from Milestones 17/18 automatically —
  zero further schema changes needed in `lib/decision` for either
  milestone to land its own enrichment.

## 20. Definition of Done

1. `resolveCompetitorKnowledge(candidates, store?)` exists in
   `lib/competitors/knowledge/`, exported from the public barrel, calling
   only `matchCompanyName`/`buildCompanyProfile`/`mergeCompanyProfile`/
   the store interface — zero new matching or building logic.
2. `lib/competitors/storage/defaultStore.ts` exists — one shared
   module-level `defaultCompetitorStore` instance, matching
   `lib/analysis-session/storage/defaultStore.ts`'s exact precedent,
   preventing the identical "two independent stores silently disagree"
   bug Milestone 12 already caught and fixed once.
3. `DecisionProfileSchema` gains `keyCompetitors: CompanyProfile[]`,
   imported from `lib/competitors`'s public barrel, never redefined.
4. `decisionEngine.ts`/`decisionProfileBuilder.ts` are updated exactly as
   Section 9 specifies — `keyCompetitors` populated, evidence aggregation
   extended, `competitorCount` now reflects the resolved count.
5. `CoverageChecklist` gains `hasCompetitorProfiles`; `CHECKLIST_SIZE`
   updated to 9; `computeCoverage()` itself requires no logic change
   (already generic over the checklist's own field count).
6. A hand-seeded verification scenario (Section 16) proves: (a) two
   near-duplicate candidates in one batch resolve to one profile, (b) a
   second batch against the same store correctly merges into an existing
   profile, accumulating sources/evidence/aliases, (c) `keyCompetitors`
   reaches `DecisionProfile` end to end.
7. `tsc --noEmit`, `eslint`, `next build` all clean.
8. `git status --short` touches only `lib/competitors/` and
   `lib/decision/` — zero frozen-path files.
9. Nothing committed until explicitly requested.

---

## Complexity Review

**Re-run for this revision, specifically re-challenging
`resolveCompetitorKnowledge()` on its own merits — not re-asserting the
first draft's conclusion.**

The specific test applied: *is this a convenience wrapper (hides a few
lines of composition, could be inlined with no loss), or does it own a
genuine orchestration responsibility (a correctness property that
wouldn't reliably exist without it)?*

A convenience wrapper would look like: `resolveOne(candidate, store) =>
matchCompanyName(...) ? mergeCompanyProfile(...) : buildCompanyProfile(...)`
— a single candidate, no state carried between calls, nothing a caller
couldn't write inline in three lines. That is **not** what this function
does, and the distinction matters:

- **It carries state across the batch that no existing function carries.**
  Neither `matchCompanyName` nor the store itself knows about "profiles
  already resolved earlier in this same call" — that accumulator
  (Section 5) is new, real state management with a real failure mode if
  omitted (intra-batch duplicates silently don't merge — Success Metrics
  requires proving this specific case). A wrapper that just forwards
  arguments to one function has no state to get wrong; this one does.
- **Removing it and inlining the loop into `decisionEngine.ts` was
  concretely tried on paper (Call Graph, "Why direct, ad hoc wiring is
  insufficient") and rejected for a specific reason: it would move a
  competitor-identity judgment into the wrong layer**, not because
  inlining is stylistically worse. That's the bar this review applies —
  "would removing this change where a decision is made, not just how
  many lines it takes" — and the answer here is yes, it would.
- **Conclusion: kept.** It owns a genuine, real, present correctness
  responsibility (batch-aware deduplication) and a genuine layering
  responsibility (competitor-identity decisions stay inside
  `lib/competitors`). It is not kept because it might be convenient for
  Market/Financial/Business later — that reasoning was deliberately
  excluded (Section 19's "Future Growth" is a note that this doesn't
  block them, not a justification for building it now).

Every other proposed piece, checked against the same "real, present
need, or only a theoretical future one?" standard:

- **`defaultCompetitorStore` is required for the core feature to work at
  all**, not a speculative addition — without a module-level singleton,
  "accumulates across runs" would silently fail the moment a second call
  created a second, empty in-memory store (the exact bug Milestone 12
  already discovered once). This is not "theoretical future use"; it's
  the mechanism the milestone's entire premise depends on.
- **No indexed/optimized matching lookup is built** (Design Debt #3) —
  the live environment has zero real candidates to justify it; adding
  one now would be exactly the "abstraction for theoretical future use"
  this review is required to remove.
- **No `category` classification heuristic is built** — attempting one
  without a reliable signal would be fabrication, not simplification-
  avoidance; the honest answer is "leave it unset," not "invent a cheap
  proxy."
- **No new schema for competitor data** — `keyCompetitors` reuses
  `CompanyProfileSchema` verbatim; no parallel "DecisionCompetitor" shape
  is introduced, directly satisfying "prefer enriching existing models
  over introducing parallel models."
- **No new storage backend, no new refresh trigger, no new pipeline
  stage.** All three were considered (a durable store, a refresh cron, a
  dedicated competitor-enrichment stage) and rejected — none has a real
  caller or a real need this milestone's own scope creates.

---

## Performance Review

- **Expected computational cost.** In the current environment: zero —
  `discoverCompetitors()` returns `candidates: []`, so
  `resolveCompetitorKnowledge()` iterates nothing. Once real candidates
  exist: O(candidates × known profiles) for matching, dominated by however
  many companies the store has accumulated — bounded and small at
  realistic early usage volumes.
- **Expected caching opportunities.** The `CompetitorKnowledgeStore` *is*
  the cache — a company matched on a second analysis reuses its existing
  `sources`/`evidence` rather than re-gathering them from scratch. This
  is the entire point of Section 5's design, not a separate optimization.
- **Expected expensive operations.** The linear matching scan (Design
  Debt #3) is the only operation whose cost grows with accumulated data
  volume; everything else (building, merging, URL dedup) is already
  O(n) over a single candidate's own small field lists.
- **Expected future scalability.** An indexed normalized-name → profile
  map (built once real usage justifies it) would take the matching pass
  from O(candidates × profiles) to near O(candidates) — a documented,
  deferred optimization (Design Debt #3), not built speculatively now.

---

## Observability

- **Expected runtime behavior.** In this environment: `synthesizeDecision()`'s
  new `resolveCompetitorKnowledge()` call always returns `[]`, silently
  and correctly — no error, no log noise, matching every other
  currently-empty code path in this app.
- **Expected intelligence-quality indicators.** Once real candidates
  exist: `DecisionProfile.keyCompetitors.length` should be less than or
  equal to raw discovery candidate count (duplicates collapsed);
  repeated analyses of similar ideas should show *growing* `sources`/
  `evidence` arrays on the same `CompanyProfile.id` over time, not
  constant-sized ones — the concrete, checkable signal that accumulation
  is real.
- **Debugging entry points.** `lib/competitors/knowledge/competitorResolver.ts`
  (the new file) is the one place to inspect a batch's match/build/merge
  decisions; `defaultCompetitorStore.list()` is the one place to inspect
  everything the platform has ever accumulated in the current process.
- **Failure indicators.** A `CompanyProfile` with `sources`/`evidence`
  that never grows across repeated runs mentioning the same company name
  means matching is failing silently (check `matchCompanyName`'s
  `reason` field, already real and descriptive) — not a new failure
  mode, the same one `COMPETITOR_PLATFORM.md`'s own verification already
  knows how to check for.

---

*End of design specification. Awaiting review before any implementation
begins.*
