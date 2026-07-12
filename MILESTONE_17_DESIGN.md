# Atlas AI — Milestone 17 Design Specification

**Market Intelligence Depth: Reasoning About Opportunity, Not Collecting Facts**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete design specification for Milestone 17,
written for review before any implementation begins.

Milestones 1–16 are complete and frozen. This milestone touches only
`lib/market/` (additive) and `lib/decision/` (additive — Decision
consuming a richer input, not being redesigned). It does not touch
`lib/pipeline/`, `lib/analysis-session/`, `lib/verification/`, or any
`app/`/`components/` file.

---

## Pre-Design Verification

Every claim below is grounded in a direct read of the current codebase.

**Read in full:** `MARKET_PLATFORM.md`, `PRODUCT_BACKLOG.md`,
`ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`, `MILESTONE_16_DESIGN.md`
(the direct precedent this milestone follows).

**Read directly, file by file:** `lib/market/index.ts`,
`lib/market/schemas/{market,sizing,trends,enums,discovery}.schema.ts`,
`lib/market/knowledge/{marketDiscovery,marketProfileBuilder,profileMerger}.ts`,
`lib/market/classification/industryClassifier.ts`,
`lib/market/trends/marketTrend.ts`, `lib/market/types/storage.ts`,
`lib/pipeline/stages/market.ts`, `lib/decision/engine/decisionEngine.ts`
(re-verified post-Milestone-16), and — via grep, not assumption — every
call site of `mergeMarketProfile`/`MarketKnowledgeStore`/`discoverMarket`
in the entire repository, plus a direct search for any LLM (`openai`)
usage anywhere across all six knowledge platforms.

### Knowledge Platform Audit

`lib/market/` is materially richer than `lib/competitors/` was before
Milestone 16 — fourteen folders, six dedicated facet builders
(`sizing/`, `segmentation/`, `geography/`, `trends/`, `regulation/`,
`risks/`), a real (not placeholder) industry classifier, and a full
refresh/scoring/storage layer mirroring the Competitor Platform's own
shape. `MarketProfile` (`schemas/market.schema.ts`) already has fields
for exactly what `PRODUCT_BACKLOG.md` asks for: `sizing` (TAM/SAM/SOM),
`growthRate` (CAGR), `marketMaturity`, `trends`, `regulations`, `risks`,
`customerSegments`, `geographicMarkets`.

**Every one of those rich fields is empty in practice, and for a
different reason than Competitors' fields were.** `CompanyProfile`'s
empty fields (Milestone 16) were empty because nothing *called* the
accumulation pipeline. `MarketProfile`'s rich fields are empty because
**no extraction pathway from real evidence into any of them has ever
been built** — confirmed directly: `sizing/marketSizing.ts`'s
`estimateTAM`/`estimateSAM`/`estimateSOM` return a `methodology` string
and no `valueUsd`, by design (no financial-data provider exists);
`segmentation/`, `geography/`, `trends/`, `regulation/`, `risks/` are
each a `build*()` function that only *validates and constructs* a
caller-supplied shape (verified directly on `trends/marketTrend.ts`) —
`MARKET_PLATFORM.md`'s own words: *"Today's builders are
construction-only... a future research-aware pipeline stage would call
them with real, evidence-backed data."* That pipeline stage was never
built. Nothing in `lib/market/knowledge/marketDiscovery.ts` ever calls
any of the five facet builders.

### Usage Audit

**The identical structural gap Milestone 16 found and fixed for
Competitors exists, unfixed, for Market.** `knowledge/marketDiscovery.ts`'s
`discoverMarket()` calls only `runResearch()`, `discoverCompetitors()`,
`classifyIndustry()`, and `buildMarketProfile()` — never
`mergeMarketProfile()`, never `MarketKnowledgeStore`. Grep-confirmed:
**zero** call sites of `mergeMarketProfile` or `lib/market`'s own
`createStore()` exist anywhere outside `lib/market/` itself (the only
hits outside it are comments in `lib/financial`/`lib/business`
describing their own analogous mergers — not real calls, verified line
by line).

### Consumer & Dependency Audit

- `lib/financial/knowledge/financialDiscovery.ts` and
  `lib/business/knowledge/businessDiscovery.ts` **each independently
  call `discoverMarket()` again**, using only `.profile.industry`/
  `.competitorCount` — the same redundant-discovery pattern Milestone 16
  found for Competitors, now confirmed for Market too (three
  independent calls per analysis: Financial, Business, Decision).
- `lib/decision/engine/decisionEngine.ts` (post-Milestone-16) consumes
  `marketDiscovery.profile.industry` (for `decisionContext.marketIndustry`)
  and `.sources`/`.evidence` (for evidence aggregation) — nothing else of
  `MarketProfile` reaches `DecisionProfile` today.
- **Zero LLM usage anywhere in the six knowledge platforms** — grep-
  confirmed across `lib/research` through `lib/decision`. Every
  classifier/extractor in this lineage (`classifyIndustry`,
  `extractCandidateName`, `matchCompanyName`) is a documented,
  deterministic heuristic. This is decisive context for this milestone's
  own scope (Market Reasoning, Section 4).

### A key asymmetry vs. Milestone 16: no fuzzy matching needed

`lib/competitors`' entity matching (Jaccard token overlap, collapsed-form
comparison) exists because company names are free text with real
variation ("HubSpot" / "Hub Spot" / "HubSpot Inc."). `classifyIndustry()`
returns one of a **fixed set** of ~11 category strings (ten industries
plus `"unclassified"`) — two discovery runs classifying the same
industry produce the *identical* string. Resolving a market to an
existing profile is an exact-match `findByIndustry()` lookup, already
built. **No new matching algorithm is needed for Market** — a genuine,
concrete simplification versus Milestone 16, not an oversight.

### Stale documentation identified

- **`MARKET_PLATFORM.md`'s "Status: not wired into the application"
  line** — accurate about the *deep* accumulation gap (still true), but
  Milestone 14 did wire `discoverMarket()` into the live pipeline in the
  shallow sense (industry + evidence reach `DecisionProfile` today).
  Same partial-staleness pattern `COMPETITOR_PLATFORM.md` had before
  Milestone 16.
- **`ARCHITECTURE.md`** — already known-stale; nothing new.
- **`ARCHITECTURE_REVIEW.md`** — still accurate for what it checked
  (Check 3's knowledge-flow verification); silent on usage-depth, which
  wasn't its question, same finding as Milestone 16.

### A pre-existing bug discovered during this audit

`decisionProfileBuilder.ts`'s `CoverageChecklist.hasMarketIndustry` has
evaluated `true` on every `DecisionProfile` ever built since Milestone
10, including ones where nothing was actually classified — silently
inflating `DecisionConfidence.coverage` for the entire product's
history. Given its own dedicated review — see "## Design Deviation"
below, not folded in here.

---

## Knowledge vs Observation

Before finalizing any persistence or merge strategy, this question has
to be answered directly, not assumed by analogy: does a `MarketProfile`
represent **accumulated knowledge** (like `CompanyProfile` — more true
facts about one stable entity) or a **time-dependent observation** (a
measurement valid only as of when it was taken, which becomes *wrong*,
not merely incomplete, once time passes)?

**The honest answer: `MarketProfile` is not uniformly either one — it's
a hybrid, and the existing (frozen, Milestone 7) schema and merge
function already treat it that way, inconsistently, without ever saying
so.** Verified directly, field by field:

- **`industry`/`subIndustry`** — a stable identity fact. An idea
  classified as "fintech" today is still "fintech" next year.
  Accumulation-appropriate; no disanalogy from `CompanyProfile` at all.
- **`customerSegments`/`geographicMarkets`/`regulations`** — durable,
  slow-changing facts. A customer segment or a jurisdiction's regulation
  doesn't reverse itself week to week the way a growth rate does.
  Accumulation-appropriate, with the same judgment Competitor's own
  `strengths`/`weaknesses` union-accumulation already makes (rare
  reversals are an acceptable cost of a simple, working model).
- **`sources`/`evidence`** — accumulation is unambiguously correct;
  more citations is always more citations, independent of whether the
  underlying claim they support is itself time-sensitive.
- **`sizing` (TAM/SAM/SOM), `growthRate` (CAGR), `marketMaturity`,
  `trends[].direction`** — these are **measurements at a point in time**,
  not facts to discover incrementally. A 2024 TAM estimate and a 2026 TAM
  estimate are not "the same fact, more evidence" — they are two
  different observations of a changing quantity. Union-merging them the
  way `features` or `strengths` merge would be actively wrong, not just
  imprecise: it would either silently discard the newer measurement or
  blend two points in time into one answer with no way to tell which is
  current.

**Concrete evidence this tension was already anticipated, and already
handled inconsistently, before this milestone existed.**
`MarketSizeEstimateSchema` (`schemas/sizing.schema.ts`) already carries
an `asOfYear` field — whoever wrote this schema at Milestone 7
recognized a size estimate needs a "measured when" marker.
`MarketGrowthRateSchema`, defined in the same file, has **no equivalent
field at all** — no way to record when a CAGR was computed. And
`MergeMarketProfileInput` (`profileMerger.ts`, frozen, unchanged by this
milestone) **already excludes `sizing`, `growthRate`, and
`marketMaturity` from its own merge contract** — confirmed directly:
none of the three appear in that interface, which means
`mergeMarketProfile`'s `{...existing, ...}` spread silently carries them
through from whichever profile was built *first*, frozen, on every
subsequent merge, forever. This is not something this milestone
introduces — it is the existing M7 function's own behavior, previously
inert only because these fields have always been empty, now confirmed
and named rather than left implicit.

**Decision for this milestone: accumulation is correct, and adopted, for
exactly the slice of `MarketProfile` this milestone's own scope
touches** — identity, durable facts, sources, evidence, confidence —
which is precisely what `mergeMarketProfile()` already implements today.
This milestone does not populate `sizing`/`growthRate`/`marketMaturity`
(Non-Goals) and therefore does not need to resolve their temporal-
versioning question to ship correctly — that question is real, but moot
for fields nobody is writing real data into yet. `trends` sits in a
narrower middle ground: its *existence* accumulates safely, but its
*direction* does not — a residual, named risk, not resolved here (Design
Debt).

**Why snapshots or full versioning are intentionally not chosen, for the
fields this milestone touches.** Versioning `industry`/`regulations`/
`sources` — fields that behave correctly under plain accumulation —
would mean building a temporal-query/versioning mechanism with no real
consumer, exactly the "abstraction for theoretical future use" the
Complexity Review is required to remove. **This is not a general
rejection of versioning** — the moment a future milestone populates
`sizing`/`growthRate`/`marketMaturity`/`trends[].direction` with real
data, that milestone must design an explicit "the newer, timestamped
observation supersedes the older one" model for those specific fields
(building on `asOfYear`-style markers, not list-union) — a snapshot
model scoped to those fields, not to `MarketProfile` as a whole. Recorded
as Design Debt, not solved here, because nothing in this milestone's own
scope writes to those fields.

## Why Market Knowledge Differs from Competitor Knowledge

Milestone 16's accumulation model cannot be assumed to transfer to
Market by analogy alone. The two knowledge domains differ on every axis
that actually determines whether accumulation is correct:

| Axis | Competitor (`CompanyProfile`) | Market (`MarketProfile`) |
|---|---|---|
| **Identity stability** | Stable and permanent — a company's identity doesn't change; "HubSpot" is the same real-world entity today, next year, and ten years from now. Learning more about it is pure accumulation. | Stable for the *classification* (`industry`), but the underlying real-world object — the market itself — is not static; its size, growth, and maturity genuinely change over calendar time. |
| **Temporal stability** | `strengths`/`weaknesses`/`features`/`pricing` are close to append-only — new real facts add to the picture; old facts rarely become *false* (a shipped feature stays shipped). | `sizing`/`growthRate`/`marketMaturity`/`trends[].direction` are measurements that can become **actively wrong**, not just incomplete, as time passes — the defining difference from Competitor data. |
| **Merge semantics** | Union-by-key is correct for every field `CompanyProfile` has — verified in Milestone 16 (aliases, sources, evidence all safely accumulate with no false-merge risk). | Union-by-key is correct for `customerSegments`/`geographicMarkets`/`regulations`/`sources`/`evidence`, but would be **actively incorrect** if naively applied to `sizing`/`growthRate`/`marketMaturity` — exactly why `mergeMarketProfile()` (Milestone 7, unchanged) already excludes them from its own merge input rather than merging them wrong. |
| **Persistence semantics** | One record per company, growing monotonically more complete. No temporal dimension needs representing anywhere. | One record per industry works for the durable-knowledge slice; the point-in-time slice needs an explicit "as of" marker to be persisted correctly at all — partially present already (`MarketSizeEstimate.asOfYear`), partially missing (`MarketGrowthRate` has no equivalent field at all). |

**Why Competitor accumulation cannot be assumed to transfer
automatically.** Milestone 16's model is correct because company facts
genuinely don't expire. Applying that same model unexamined to
`MarketProfile` — reasoning "we did it this way for the sibling
platform, so it must be right here too" — would have been a category
error. This comparison is recorded here explicitly as the argument
against exactly that reasoning, which is what this revision was
requested to catch.

## Design Deviation

**The bug.** `decisionProfileBuilder.ts`'s
`CoverageChecklist.hasMarketIndustry` is computed as
`Boolean(input.decisionContext.marketIndustry)`. `classifyIndustry()`
never returns `undefined` — it returns `"unclassified"` when nothing
matches. `decisionEngine.ts` always passes
`marketDiscovery.profile.industry` through unconditionally. Since
`Boolean("unclassified")` is `true`, this check has evaluated `true` on
every `DecisionProfile` ever built since Milestone 10, including every
one where nothing was actually classified — silently inflating
`DecisionConfidence.coverage` for the entire product's history.

**Why this is a genuine bug, not a stylistic preference.** The
checklist's entire purpose (`decisionConfidence.ts`) is to measure real
coverage — "how much of what we could know, do we actually know." A
field that reads `true` regardless of whether real classification
succeeded doesn't measure anything; it is a constant disguised as a
signal. This isn't a design choice open to taste — a boolean that
cannot ever evaluate `false` under real conditions is, definitionally,
not doing its job.

**Why fixing it belongs in this milestone.** This milestone is already
opening `CoverageChecklist` to add `hasMarketProfile` (Section 12) — the
same file, the same object literal, the same underlying question ("do
we have real market knowledge"). Leaving a known-broken sibling field
unfixed one line away, in the same edit, while adding a new correct one
right next to it, would read to a future engineer as an oversight, not a
choice. The fix touches zero files beyond the ones this milestone is
already modifying and changes zero unrelated behavior.

**Why it is not scope creep.** Scope creep would be fixing this because
"while I'm here, I noticed something else broken" in a part of the
codebase this milestone has no other reason to touch. That is not the
case here: `CoverageChecklist` and its two construction sites
(`decisionProfileBuilder.ts`, `profileMerger.ts`) are already, of
necessity, part of this milestone's approved work (Section 12). The fix
is a one-line change to logic already open in the same diff — not a new
file, a new call site, or a new responsibility. The dividing line
between "a necessary correctness fix within work already being done" and
"scope creep" is exactly whether new files, call sites, or
responsibilities get introduced — none are, here.

**This remains a flagged decision, not a silently-bundled one.** The
reviewer may still approve, defer, or reject this specific fix
independently of the rest of the milestone — noted explicitly in
Definition of Done and Risks.

## Deterministic Reasoning

**Why this milestone intentionally avoids introducing LLM reasoning.**
Every question this milestone's own mission statement poses — "is this
market growing," "how mature is it," "which trends are structural" — is,
on its face, exactly the kind of question an LLM could plausibly answer
given enough context. That this milestone doesn't reach for one is a
deliberate architectural choice, not an oversight, for three concrete
reasons:

1. **Zero precedent exists.** Confirmed by direct search: no LLM call
   exists anywhere across `lib/research` through `lib/decision` — six
   platforms, sixteen milestones, entirely deterministic. Every
   classifier in this lineage (`classifyIndustry`, `extractCandidateName`,
   `matchCompanyName`) is a documented, auditable heuristic whose full
   behavior can be read from its own source in under a minute.
   Introducing the first LLM call is not "one more heuristic" — it is a
   new category of component with a new failure mode (plausible-sounding
   fabrication) this entire architecture has been deliberately built to
   avoid.
2. **An LLM call would not fail honestly.** Every deterministic function
   in this lineage fails by returning an honest absence
   (`"unclassified"`, a `0` confidence, an empty array) — a caller can
   trust that "nothing returned" means "nothing was found." An LLM asked
   "is this market growing" against thin or absent evidence does not
   reliably fail this way — it produces plausible, confident-sounding
   prose regardless of whether real evidence supports it, precisely the
   failure mode `PRODUCT_BACKLOG.md`'s Trust & Evidence complaint
   (Milestones 11–13's entire reason for existing) was built to
   eliminate. Adopting one here would work directly against three
   milestones of prior work.
3. **The decision to introduce one is bigger than this milestone's
   mandate.** Cost, latency, prompt-injection surface (from real research
   content flowing into a prompt), and a new verification burden (how do
   you evidence-check an LLM's own output?) are all real, all
   unresolved, and belong to a dedicated design conversation of their
   own — not a side effect of a "Market Intelligence Depth" milestone.

**Why deterministic reasoning is currently the correct architectural
choice, not merely the cautious one.** Every real signal this milestone
surfaces — classification confidence, source count, corroboration — is
*auditable*: a reader can trace exactly why Atlas AI believes what it
believes, step by step, through code that never guesses. That
auditability is the whole of what `PRODUCT_BACKLOG.md`'s Trust &
Evidence complaint asked for. An LLM-based answer to "is this market
growing" would be *less* trustworthy than today's honest "unknown," not
more — a confident wrong answer is strictly worse than an honest absence
for a product whose stated purpose is being the skeptical voice a
founder doesn't otherwise have.

---

## 1. Purpose

Two things, not one: (1) fix the identical structural gap Milestone 16
fixed for Competitors — wire `lib/market`'s own accumulation pipeline
into the live decision path — and (2) be explicit and honest about what
"Market Intelligence Depth" cannot yet mean, because the deeper analytical
questions this milestone was framed around (growth, maturity,
fragmentation, trend durability) have no reliable data source or
reasoning mechanism in this codebase today, and inventing one would be
fabrication, not intelligence.

## 2. Product Vision

> A venture analyst doesn't ask "what facts exist about this market" —
> they ask "does this market represent a compelling opportunity, and how
> sure am I." Atlas AI should ask the same question of itself: not "what
> did I find," but "what have I actually earned the right to conclude."

Today, for nearly every question a VC analyst would ask about a market,
the honest answer is "unknown" — and this milestone's job is to make
that honesty structural (a real, accumulating profile that says so
explicitly) rather than papering over it with a plausible-sounding
guess.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| Is this market growing or shrinking? | No — `growthRate` requires real CAGR data (no provider exists); stays honestly unset. |
| How mature is it? | No — `marketMaturity` requires a real signal this codebase doesn't have; stays honestly unset. |
| How fragmented/saturated is it? | Partially — the *number of real, accumulated competitors* Atlas has discovered (Milestone 16's own `keyCompetitors`) is a real, evidence-backed data point available at the `DecisionProfile` level; Atlas does not itself label a market "fragmented" or "consolidated" from that alone (Section 10). |
| Where is unmet demand / oversupply? | No — requires real demand-signal data (search volume, job postings, funding velocity); none integrated. |
| What trends matter, and are they temporary or structural? | No — `trends` requires either a real trend-data feed or a deliberate reasoning capability; neither exists. The schema (`MarketTrend.direction`) is ready for whichever arrives first. |
| What evidence supports each conclusion? | Yes, for what *is* concluded — every field this milestone populates traces to real `Source`/`Evidence`, same as Milestone 16. |
| How confident are we? | Yes — `DecisionConfidence` gains a real, computed signal for market-knowledge presence (Section 7), plus a corrected `hasMarketIndustry` signal (Section 14). |
| What remains unknown? | Yes, explicitly (Section 13) — not silently absent. |

## 4. Market Reasoning

**How Atlas AI should think about markets, not how it searches them.**

The honest reasoning posture this milestone establishes: a market
conclusion is only as strong as the independent, corroborating evidence
behind it. Atlas AI does not currently have — and this milestone does not
build — a mechanism to *reason* over unstructured evidence text. See
"## Deterministic Reasoning" (above) for the full justification of why
that capability is deliberately not introduced here. Given that:

- Atlas AI can **classify** (a fixed, known category, via keyword
  overlap) — real, already built.
- Atlas AI can **count** (how many independent sources, how many
  distinct accumulated competitors, how many discovery runs have
  corroborated the same claim) — real, computable, evidence-grounded.
- Atlas AI **cannot yet synthesize an opinion** ("this market is
  growing," "this trend is structural") from unstructured text without
  either a real structured data source or a genuinely new reasoning
  capability. Not attempted here.

This milestone's reasoning posture, concretely: **classify and count what
is real; never synthesize what isn't.** Section 10 (Signal vs. Noise)
makes this operational.

## 5. Market Discovery Strategy

**Discovery itself does not change.** `discoverMarket()` stays exactly as
built — calls only `runResearch()`/`discoverCompetitors()`/
`classifyIndustry()`, storage-free. This milestone adds the same "the
caller's job" `MARKET_PLATFORM.md` always deferred: a new function,
**`resolveMarketKnowledge()`**, that takes a freshly-built,
still-unpersisted `MarketProfile` and either merges it into an existing,
same-industry profile or persists it as the industry's first record —
**only for the accumulation-appropriate slice of `MarketProfile`**
identified in "## Knowledge vs Observation" above (identity, durable
facts, sources, evidence, confidence). It never touches `sizing`/
`growthRate`/`marketMaturity`, which stay excluded from the merge
contract exactly as `mergeMarketProfile()` already has them.

Unlike Milestone 16's resolver, no fuzzy matching is needed (Pre-Design
Verification) — resolution is `findByIndustry(profile.industry)`, an
exact lookup against a fixed category set. One deliberate business rule
this milestone adds: **`"unclassified"` results are never persisted or
merged.** Accumulating unrelated ideas' evidence under one meaningless
bucket would degrade data quality, not improve it — a freshly-classified
`"unclassified"` profile is returned as-is, unresolved, every time.

## 6. Market Structure Strategy

`MarketProfile.customerSegments`/`.geographicMarkets` remain exactly as
built — construction-only, populated only when a caller supplies real,
evidenced data. This milestone supplies none (Section 13) and does not
add automatic segmentation/geography extraction. What *does* change: once
`resolveMarketKnowledge()` exists, any future milestone that *does* add
real segment/geography extraction gets accumulation "for free" — the
merge logic (`mergeMarketProfile`, already real, already deduping by
normalized name) is exercised for the first time by this milestone,
proven correct, and ready for richer input later.

## 7. Demand Analysis Strategy

No demand-side signal exists in this codebase today (search volume, job
postings, waitlist signals) and none is added. `MarketProfile` has no
dedicated "demand" field — the closest existing proxy,
`ResearchResult.sourceSummary.averageConfidence`, measures *how confident
the sources are*, not *how much demand exists*, and this milestone does
not conflate the two. Demand analysis stays a named, honest gap (Section
13/19), not filled with a proxy that would misrepresent itself.

## 8. Supply Analysis Strategy

The one real, honest supply-side signal available today: **the number of
distinct, real competitors Atlas AI has actually discovered and
accumulated** (`DecisionProfile.keyCompetitors.length`, Milestone 16).
This milestone adds no new supply metric to `MarketProfile` itself —
deliberately (Section 9): the signal already exists, one layer up, and
duplicating it onto `MarketProfile` would create a second source of
truth for the same count. A future reader (or Reports/Dashboard
milestone) correlates `DecisionProfile.marketProfile.industry` with
`DecisionProfile.keyCompetitors.length` directly — real data, presented
side by side, not synthesized into a single fabricated "supply score."

## 9. Trend Analysis Strategy

`trends/marketTrend.ts`'s `buildMarketTrend()` already requires a real,
non-defaulted `direction` (rising/stable/declining) — this milestone adds
no automatic trend detection (Section 4: no reasoning capability exists
to distinguish "temporary" from "structural" from unstructured text).
`resolveMarketKnowledge()`'s merge step (`mergeMarketProfile`, unchanged)
already dedupes trends by normalized name across accumulated runs — ready
the moment a real trend source exists, exercising real, tested
accumulation logic today even while the list itself stays empty.

## 10. Signal vs. Noise

The operational definition Section 4's reasoning posture requires:

- **Strong signal:** a claim corroborated by more than one independent
  source (different domains), or a value directly computed from
  already-real data (a classification's own keyword-match confidence, a
  real accumulated competitor count). These are the only things this
  milestone treats as fit to surface as a "conclusion."
- **Weak signal:** a claim from exactly one source, no corroboration.
  Surfaced only as evidence attached to a specific claim (unchanged
  Verification behavior) — never elevated into a `MarketProfile` field
  like `marketMaturity`/`growthRate`/`trends` on this milestone's own
  authority.
- **Noise:** an unsourced assertion, marketing copy, or a single mention
  with no corroboration and no structured backing. Never enters
  `MarketProfile` at all — the existing `build*()` functions' required,
  non-defaulted fields already structurally prevent this (a caller must
  supply a real value; there is no silent default path).

This milestone does not add a corroboration-counting utility of its own —
`Evidence`'s existing shape already lets a future consumer count distinct
`source.domain` values per claim; building a dedicated counter now, with
no real multi-source data in this environment to count, would be
exactly the "abstraction for theoretical future use" the Complexity
Review must remove.

## 11. Evidence Strategy

Identical mechanism to Milestone 16: `resolveMarketKnowledge()`'s merge
step unions `sources`/`evidence` by URL (`mergeMarketProfile`, unchanged,
already real). Once wired, `decisionEngine.ts`'s `aggregateEvidence()`
call is extended to fold in the *resolved* `marketProfile.sources`/
`.evidence` (accumulated across every prior run for that industry)
rather than only this run's fresh, unpersisted `marketDiscovery.profile.sources`/
`.evidence` — the same "richer evidence flows automatically" property
Milestone 16 established for competitors, now real for markets too.

## 12. Confidence Strategy

`MarketProfile.confidence` is unchanged — already real, computed from
`ResearchResult.sourceSummary.averageConfidence` averaged with
classification confidence (`marketDiscovery.ts`, verified). Two changes
to `DecisionConfidence`'s own coverage checklist:

1. **New signal: `hasMarketProfile`** (`marketProfile.industry !== "unclassified"`)
   — mirrors `hasCompetitorProfiles`, directly tying a real, classified
   (not merely attempted) market to a measurable confidence change.
2. **Corrected signal: `hasMarketIndustry`** — see "## Design Deviation"
   above. Flagged explicitly for review, not silently folded in.

## 13. Unknowns Strategy

Named explicitly — every one of these stays genuinely unset by this
milestone:

- **`sizing` (TAM/SAM/SOM)** — no financial-data provider exists;
  `estimateTAM`/`SAM`/`SOM` continue returning methodology-only estimates.
- **`growthRate`** — no CAGR data source exists.
- **`marketMaturity`** — no reliable signal exists to classify
  emerging/growth/mature/declining from a search snippet.
- **`trends`, `regulations`, `risks`, `customerSegments`,
  `geographicMarkets`** — all require either a real structured source or
  a deliberate extraction/reasoning capability; neither exists.
- **Demand and oversupply signals** — no data source exists (Section 7).

`DecisionProfile.decisionLimitations`/`.openQuestions` (unchanged) remain
the correct place these surface today.

## 14. Decision Relationship

Decision Intelligence continues owning synthesis — richer input only:

- **`DecisionProfileSchema` gains one new, additive field:
  `marketProfile: MarketProfileSchema`** — reused verbatim from
  `lib/market`'s public barrel, always present (never optional — a
  `MarketProfile` object always exists post-classification, even for
  `"unclassified"`), exactly the "one schema per shape" discipline every
  prior milestone held.
- **`buildDecisionProfile()`'s `BuildDecisionProfileInput` gains
  `marketProfile: MarketProfile`** (required, since `discoverMarket()`
  always produces one) — placed onto the returned profile unchanged.
- **`synthesizeDecision()` calls `resolveMarketKnowledge()`** right after
  `discoverMarket()` resolves, and extends its existing
  `aggregateEvidence()` call with the *resolved* profile's sources/
  evidence (Section 11).
- **The `hasMarketIndustry` fix** — proposed: change from
  `Boolean(input.decisionContext.marketIndustry)` to
  `Boolean(input.decisionContext.marketIndustry) && input.decisionContext.marketIndustry !== "unclassified"`.
  Full justification (why it's a genuine bug, why it belongs in this
  milestone, why it isn't scope creep) is in "## Design Deviation" above,
  reviewable independently of the rest of this milestone; the new
  `hasMarketProfile` signal (Section 12) does not depend on it being
  fixed.
- Decision never classifies, sizes, or scores a market itself —
  `resolveMarketKnowledge()` lives in `lib/market/`, imported from its
  public barrel.

## 15. Verification Relationship

Zero changes to `lib/verification/`. Because Section 11 makes
`DecisionProfile.sources`/`.evidence` richer (accumulated market evidence,
not just one run's), `VerificationSummary` reflects a fuller trust
picture automatically — the same "automatic enrichment" property
Milestone 16 already demonstrated real, now demonstrated twice.
`marketProfile` itself is **not** separately exposed through
`VerificationSummary` this milestone (Non-Goal) — a future Dashboard/
Reports concern.

## 16. Pipeline Relationship

**Nothing changes.** `lib/pipeline/stages/market.ts` calls
`discoverMarket()` and only that — unchanged, since `discoverMarket()`'s
own signature and behavior are untouched. `resolveMarketKnowledge()` is
called from `decisionEngine.ts`, inside the existing `decision` stage's
own work.

## 17. Data Flow

```
synthesizeDecision(request)
  │
  ├─ runResearch(...) / discoverCompetitors(...) / discoverMarket(...) /
  │  discoverFinancials(...) / discoverBusiness(...)             [unchanged, concurrent]
  │
  ├─ resolveCompetitorKnowledge(competitorDiscovery.candidates)   [Milestone 16, unchanged]
  │     → keyCompetitors: CompanyProfile[]
  │
  ├─ resolveMarketKnowledge(marketDiscovery.profile)               NEW
  │     → findByIndustry(profile.industry)   (skip entirely if "unclassified")
  │     → matched:   mergeMarketProfile(existing, freshProfile fields)
  │     → unmatched: freshProfile persisted as-is
  │     → store.upsert(resolved)
  │     → marketProfile: MarketProfile   (real, accumulating)
  │
  ├─ aggregateEvidence([..., marketProfile.sources, ...keyCompetitors.map(c => c.sources)],
  │                     [..., marketProfile.evidence, ...keyCompetitors.map(c => c.evidence)])   EXTENDED
  │
  └─ buildDecisionProfile({ ..., marketProfile, keyCompetitors, sources, evidence })              EXTENDED
        │
        ▼
  DecisionProfile { ..., marketProfile: MarketProfile, keyCompetitors: CompanyProfile[] }
        │
        ▼ (unchanged — Milestone 14's existing chain)
  VerificationSummary  (automatically richer — Section 15)
```

**Where market knowledge enters:** at one new, explicit point —
`resolveMarketKnowledge()`'s return value, assigned directly to
`DecisionProfile.marketProfile`.

## 18. Information Flow

The honest trail this milestone establishes: **a market claim → the
accumulating `MarketProfile` it belongs to → the real `Evidence`/`Source`
backing it → whether that evidence was corroborated by more than one
source (Section 10).** Exactly the same chain Milestone 16 established
for competitor claims, now real for market claims too. What this
milestone explicitly does *not* add: a synthesized narrative connecting
those claims into an opinion ("this market is attractive because...") —
that remains `findings/findingBuilder.ts`'s own, still-placeholder job
(Milestone 10), untouched here.

## 19. Risks

- **Zero observable effect in this environment today** — `discoverMarket()`
  returns real classification (industry names are computed from the idea
  text itself, not from search results) but empty sources/evidence
  without search-provider credentials. `resolveMarketKnowledge()` will
  correctly persist/merge real industry classifications even in this
  environment (unlike Milestone 16, where the equivalent path was
  entirely silent) — verification must confirm accumulation across two
  same-industry ideas, which *is* observable today without credentials.
- **The `hasMarketIndustry` fix changes existing confidence output**
  (Section 14) — explicitly flagged, not bundled silently.
- **`"unclassified"` skip-persistence rule is a judgment call**, not a
  mechanically forced one — documented explicitly (Section 5) so a future
  reader understands it was a deliberate data-quality decision, not an
  oversight.
- **Redundant `discoverMarket()` calls remain** (Financial, Business,
  Decision — Pre-Design Verification's Consumer Audit) — same Design Debt
  class as Milestone 16, not fixed here for the same reason (would touch
  Financial/Business's own established call patterns).

## 20. Non-Goals

- Does not add TAM/SAM/SOM calculation, CAGR/growth-rate data, or market
  maturity classification — no reliable data source exists.
- Does not add trend detection, regulation extraction, risk extraction,
  segmentation extraction, or geography extraction from evidence text —
  no reasoning capability or structured source exists.
- Does not introduce an LLM call anywhere — confirmed zero precedent
  exists in this lineage; a decision of that scope is explicitly beyond
  this milestone's mandate.
- Does not add a "fragmentation," "saturation," or "opportunity" score of
  any kind — `lib/market/scoring/` remains exactly as architecture-only
  as before.
- Does not add a `knownCompetitorCount`-style field to `MarketProfile` —
  that signal already exists at `DecisionProfile.keyCompetitors.length`;
  duplicating it would create a second source of truth (Section 8).
- Does not change who calls `discoverMarket()` (Financial/Business's own
  redundant calls stay as-is — Design Debt, Section 19).
- Does not change `MarketDiscoveryResult.competitorCount` (stays the raw,
  pre-resolution count — resolution remains Decision's job only, exactly
  as Milestone 16 established for `DecisionProfile`'s own count).
- Does not touch `lib/pipeline/`, `lib/analysis-session/`,
  `lib/verification/`, any `app/`/`components/` file, or Decision's own
  `findings/`/`redflags/` placeholder derivation.
- Does not add a durable (non-memory) storage backend.

## 21. Success Metrics

- `resolveMarketKnowledge()` exists, exported from `lib/market`'s public
  barrel, is the only new function this milestone adds to that platform.
- Two discovery runs classifying the *same* industry (verified via a
  hand-seeded or real classification scenario) resolve to one
  accumulating `MarketProfile`, with sources/evidence growing across the
  second run — demonstrated against a real store, not only asserted.
- A `"unclassified"` result is confirmed **not** persisted to the store
  (store's `list()` count unchanged after processing it).
- `DecisionProfile.marketProfile` is populated end to end from a real
  `synthesizeDecision()` call.
- `DecisionConfidence.coverage`'s new `hasMarketProfile` signal
  measurably changes coverage between an unclassified and a classified
  profile.
- `git status --short` touches only `lib/market/` and `lib/decision/`.

## 22. Design Debt

1. **Redundant `discoverMarket()` calls** (Financial, Business, Decision)
   — not fixed, same reasoning as Milestone 16's equivalent debt item.
2. **`MemoryMarketStore` is the only real backend** — accumulation is
   real but not durable across a process restart, same status as every
   other platform's storage layer.
3. **The `hasMarketIndustry` bug predates this milestone** and is only
   being fixed here because this milestone is already touching the
   checklist — a reminder that confidence-signal correctness across all
   five platforms' own checklists hasn't been independently audited.
4. **`trends[].direction` has no temporal-versioning strategy.**
   `mergeMarketProfile()` already dedupes trends by name, but a later
   observation with a *different* direction for the same named trend
   would silently collide with the dedup key rather than correctly
   superseding the earlier one — unlike `sizing`/`growthRate`/
   `marketMaturity` (which are simply excluded from merging and stay
   frozen), this field is merged, just not merged *correctly* once real
   direction changes exist. Inert today only because `trends` stays
   empty (Non-Goals); a future milestone populating it must resolve this
   before real data flows in.
5. **`MarketGrowthRateSchema` has no `asOfYear`-equivalent field**, unlike
   `MarketSizeEstimateSchema` (which already anticipated the problem —
   see "## Knowledge vs Observation"). A future milestone populating
   `growthRate` should add one before writing real data, to make a
   "newer observation supersedes older" merge strategy possible at all.

## 23. Product Readiness

Honest assessment: this milestone closes the *structural* gap
(accumulation) for Market, exactly as Milestone 16 did for Competitors,
and corrects one real, silent confidence-calibration bug found along the
way. It does **not** close `PRODUCT_BACKLOG.md`'s Market Intelligence
content asks — "TAM/SAM/SOM with sources," "growth charts," "geographic
breakdown," "entry barriers," "regulations," "market trends supported by
evidence" all remain unanswered, because answering them honestly requires
data sources or reasoning capabilities this codebase does not have. What
ships: a real, accumulating market-identity record with correctly-derived
confidence — the foundation those richer asks would build on, not an
answer to them.

## 24. Future Growth

How Milestone 18 (Financial Intelligence Depth) builds on this work:

- `lib/financial`'s own `financialDiscovery.ts` already calls
  `discoverMarket()` (Pre-Design Verification) — once Financial gains its
  own `resolveFinancialKnowledge()`-shaped pattern, it can read the
  *same*, now-accumulating `MarketProfile` (via `findByIndustry()`) for
  the same industry rather than treating market context as a one-off,
  unpersisted read.
- `MarketProfile.sizing`/`.growthRate` are already the right shape for
  Financial Intelligence Depth to populate once a real structured
  financial-data source exists — this milestone doesn't populate them,
  but does mean Financial's own future enrichment writes to the *same*
  accumulating profile Milestone 18 would otherwise have to build its
  own persistence for.
- **What does not need to change:** `DecisionProfileSchema.marketProfile`'s
  shape (already `MarketProfile`, reused verbatim) absorbs richer content
  from Milestone 18 automatically.

## 25. Definition of Done

1. `resolveMarketKnowledge(freshProfile, store?)` exists in
   `lib/market/knowledge/`, exported from the public barrel — calling
   only `findByIndustry`/`mergeMarketProfile`/the store interface, plus
   the one new business rule (skip persistence for `"unclassified"`).
2. `lib/market/storage/defaultStore.ts` exists — one shared module-level
   `defaultMarketStore` instance, matching Milestone 16's/Milestone 12's
   exact precedent.
3. `DecisionProfileSchema` gains `marketProfile: MarketProfileSchema`,
   imported from `lib/market`'s public barrel.
4. `decisionEngine.ts`/`decisionProfileBuilder.ts` updated exactly as
   Section 14 specifies.
5. `CoverageChecklist` gains `hasMarketProfile`; `CHECKLIST_SIZE` updated
   to 10; the `hasMarketIndustry` fix ("## Design Deviation") is
   implemented and separately called out in the completion report for
   explicit review.
6. A verification scenario proves: (a) two same-industry discovery
   results merge into one accumulating profile, (b) an `"unclassified"`
   result is never persisted, (c) `marketProfile` reaches
   `DecisionProfile` end to end.
7. `tsc --noEmit`, `eslint`, `next build` all clean.
8. `git status --short` touches only `lib/market/` and `lib/decision/`.
9. Nothing committed until explicitly requested.

---

## Complexity Review

- **Is `resolveMarketKnowledge()` justified, or a convenience wrapper?**
  Honestly smaller than Milestone 16's equivalent — no fuzzy-matching
  algorithm, no batch/intra-run dedup state. Its justification rests on
  two things, not algorithmic size: (1) layering — deciding whether a
  classified industry matches an existing knowledge-base entry is a
  market-identity judgment that belongs in `lib/market`, not
  `lib/decision`, exactly the Milestone 16 precedent; (2) a genuine,
  non-trivial business rule (skip `"unclassified"` persistence) that
  isn't obvious from any existing function alone and deserves a named,
  documented home. Kept — but the design is explicit that "simple" and
  "unjustified" aren't the same question.
- **No `MarketProfile.knownCompetitorCount` field added** — already
  available at `DecisionProfile.keyCompetitors.length`; adding it here
  would be a parallel model of the same data (Section 8).
- **No corroboration-counting utility built** — no real multi-source
  data exists in this environment to justify one yet (Section 10).
- **No demand-signal field, no fragmentation/saturation score** —
  considered and rejected; no real data source exists, and inventing a
  proxy would be exactly the fabrication this project's entire
  discipline exists to prevent.
- **No LLM integration** — considered explicitly, given how directly the
  milestone's own framing ("is this market growing," "which trends are
  structural") invites it. Rejected: zero precedent exists in six
  platforms' worth of prior milestones, and introducing one is a
  decision with implications far beyond "Market Intelligence Depth"
  (cost, latency, a new class of failure mode, a new fabrication
  surface) that deserves its own dedicated design, not to be smuggled in
  as a side effect of this one.

---

## Performance Review

- **Expected computational hotspots:** none — `resolveMarketKnowledge()`
  is a single `findByIndustry()` lookup (already O(1)-ish against a
  Map-backed store) plus one merge; no batch loop like Milestone 16's
  resolver.
- **Expensive operations:** none identified beyond the pre-existing
  `mergeMarketProfile()` list-dedup operations (small, already O(n) over
  a single profile's own field lists).
- **Cache opportunities:** the `MarketKnowledgeStore` is itself the
  cache — a second analysis of the same industry reuses accumulated
  sources/evidence rather than starting over, same principle as
  Milestone 16.
- **Scaling risks:** none new — the store holds at most ~11 profiles
  (one per fixed industry category) in the current classifier design,
  making this dramatically cheaper at scale than Competitor's
  per-company accumulation (unbounded company count vs. a fixed,
  small industry set).

---

## Observability

- **Runtime behavior:** in this environment, `resolveMarketKnowledge()`
  still runs meaningfully (unlike Milestone 16's competitor resolver,
  which is fully silent without credentials) — real industry
  classification happens from idea text alone, so accumulation is
  observable today even with zero search-provider credentials.
- **Debugging entry points:** `lib/market/knowledge/marketResolver.ts`
  for merge/persist decisions; `defaultMarketStore.list()` for everything
  accumulated in the current process.
- **Market quality indicators:** `MarketProfile.confidence` and
  `sources.length` growing across repeated analyses of the same industry
  is the concrete, checkable signal accumulation is real.
- **Evidence quality indicators:** number of distinct `source.domain`
  values backing a given market's accumulated evidence (inspectable
  today, not a new computed field — Section 10).
- **Confidence calibration indicators:** `DecisionConfidence.coverage`
  should differ measurably between an `"unclassified"` and a real
  classification, and (once Section 14's fix lands) should no longer be
  inflated by a vacuously-true `hasMarketIndustry`.
- **Failure indicators:** a `MarketProfile` whose `sources`/`evidence`
  never grows across repeated analyses of the same industry means
  `resolveMarketKnowledge()` isn't finding the existing record — check
  `findByIndustry()`'s exact-match assumption against the actual
  `industry` string being passed.

---

## Architectural Discovery

Documented, not expanded into implementation:

- **The Milestone 16 "systemic gap" pattern is now confirmed a third
  time** (Competitors, then Market here) — every downstream knowledge
  platform built a complete accumulation layer that its own per-request
  discovery flow never wired in. Given Financial and Business almost
  certainly share this same shape (not verified here — out of this
  milestone's scope), a future engineering-focused milestone (not a
  per-platform "Depth" milestone) may eventually be worth naming
  explicitly to close this pattern everywhere at once rather than
  platform-by-platform. Not proposed as work here — recorded as an
  observation only.
- **The `hasMarketIndustry` vacuous-truth bug is the kind of thing that
  likely has siblings** — `hasFundingStage`, `hasBusinessModel`, etc. in
  the same checklist were not independently re-audited this milestone
  (out of scope); worth a dedicated confidence-checklist audit at some
  point, not assumed correct just because they weren't flagged here.

---

*End of design specification. Awaiting review before any implementation
begins.*
