# Atlas AI — Milestone 20 Design Specification

**Shared Knowledge-Platform Utilities: Paying Down Debt at the Exact
Point It Was Meant to Be Paid**

Status: **Design only. No code, no folders, no source files exist yet.**

Milestones 1–19 are complete and frozen. This document was produced by
first determining what Milestone 20's real architectural problem *is* —
explicitly not by assuming it repeats Milestones 16–19's shape. It does
not. Milestones 16–19 each closed a "built but never wired" gap between
an upstream knowledge platform and `DecisionProfile`. That entire class
of problem is now closed — all five platforms Decision consumes
(Research, Competitors, Market, Financial, Business) are wired in as
deep as this project's own Authentication-gated identity boundary
currently allows. **Milestone 20 is a different kind of milestone: it
does not touch `DecisionProfile`, `lib/decision/`'s schema, or any
knowledge platform's accumulation semantics at all.** It addresses a
different, already-documented, already-named piece of technical debt, at
the exact point two independent existing documents said it should be
paid.

---

## 4. Pre-Design Verification

Every claim below is grounded in a direct read of the current codebase,
not memory, and not by trusting `ARCHITECTURE_REVIEW.md`'s own
characterization without checking it directly.

**Read in full:** `ARCHITECTURE_REVIEW.md`, `DECISION_PLATFORM.md`
(fully, including its "Future Consumers"/"Also on the roadmap" sections
not previously read in this project), `PRODUCT_BACKLOG.md`,
`ARCHITECTURE.md`, `BUSINESS_PLATFORM.md`, `MILESTONE_16–19_DESIGN.md`.

**Read directly, file by file, to independently verify (not assume) the
duplication claim:** every `dedupeByKey.ts` in `lib/market/utils/`,
`lib/financial/utils/`, `lib/business/utils/`, `lib/decision/utils/`;
every `urlNormalization.ts` in `lib/competitors/utils/`,
`lib/market/utils/`, `lib/financial/utils/`, `lib/business/utils/`,
`lib/decision/utils/`; every `textNormalization.ts` in
`lib/market/utils/`, `lib/financial/utils/`, `lib/business/utils/`;
`lib/competitors/utils/companyNormalization.ts`; `lib/research/utils/normalization.ts`;
every `computeDiscoveryConfidence()` in `lib/market/knowledge/marketDiscovery.ts`,
`lib/financial/knowledge/financialDiscovery.ts`,
`lib/business/knowledge/businessDiscovery.ts`; and every `dedupeByUrl()`
wrapper inside each platform's own `knowledge/profileMerger.ts`.

**Grep-verified:** `lib/shared/` does not exist yet; no platform outside
the five knowledge platforms (`lib/verification/`, `lib/pipeline/`,
`lib/analysis-session/`) duplicates any of these helpers, confirming the
debt is scoped exactly to the five knowledge platforms named in
`ARCHITECTURE_REVIEW.md`; zero external callers exist for
`buildInvestmentMemo`/`buildDueDiligenceReport`/`buildExecutiveSummary`/
`aggregateRecommendations` (an alternative candidate problem, considered
and set aside below).

### Knowledge Platform Audit / Architectural Discovery — the actual finding

**The utility-duplication claim in `ARCHITECTURE_REVIEW.md`'s Technical
Debt #1 is real but was more mixed than its own summary implies.** Direct
comparison of every implementation sorts the claimed duplicates into
three distinct tiers — a refinement this investigation found by reading
each file, not something the prior review itself distinguished:

**Tier 1 — genuinely byte-identical, safe to consolidate as-is:**
- `dedupeByKey<TItem>(items, keyFn)` — confirmed byte-identical (only
  doc comments differ) across `lib/market`, `lib/financial`,
  `lib/business`, `lib/decision` — four copies.
- `urlDedupeKey(rawUrl)` — confirmed byte-identical across
  `lib/competitors`, `lib/market`, `lib/financial`, `lib/business`,
  `lib/decision` — five copies.
- The `dedupeByUrl<TItem extends { url: string }>(items)` wrapper
  (`items => dedupeByKey(items, item => urlDedupeKey(item.url))`) —
  **a sixth, uncounted duplicate `ARCHITECTURE_REVIEW.md` didn't
  separately tally**: this exact wrapper is independently reimplemented
  inside every one of the five platforms' own `knowledge/profileMerger.ts`
  files.

**Tier 2 — same simple policy, safe to consolidate under one name:**
- `normalizeLabel(label)` (`lib/business`, `lib/financial`) and
  `normalizeIndustryName(name)` (`lib/market`) — byte-identical bodies
  (`trim().toLowerCase().replace(/\s+/g, " ")`), differing only in name
  and doc comment. Safe to merge into one `normalizeLabel`.

**Tier 3 — NOT safe to consolidate; correctly reviewed and rejected:**
- **`computeDiscoveryConfidence()`** — `ARCHITECTURE_REVIEW.md` calls
  this "a separately-written near-duplicate of the same averaging
  policy," but direct comparison shows the three implementations are
  **not the same shape**: Market's takes `(averageSourceConfidence,
  classification)`; Financial's takes `(averageSourceConfidence,
  marketConfidence)` — two arguments; Business's takes
  `(averageSourceConfidence, marketConfidence, financialConfidence)` —
  three arguments, with an extra `upstreamAverage` step Financial's
  doesn't need. Each is genuinely shaped by how many upstream
  confidences that specific platform has to average, which grows by
  exactly one at each layer (Research → Market → Financial → Business).
  Forcing these into one shared function would require either a
  variadic-average abstraction with no current second caller shaped
  like it, or a generic "confidence averaging policy" object nobody
  asked for — exactly the kind of premature, clever abstraction
  `CLAUDE.md`'s engineering philosophy warns against ("unnecessary
  abstraction is exactly as bad as unnecessary cleverness"). **Not
  extracted this milestone** — see Non-Goals.
- **`normalizeCompanyName()` / `tokenizeCompanyName()`
  (`lib/competitors`)** — `ARCHITECTURE_REVIEW.md` itself already
  flagged the caveat ("lib/competitors's version additionally stripping
  legal suffixes"), and direct comparison confirms this is not a
  duplicate of `normalizeLabel` at all: it strips a list of eleven legal
  suffixes (`inc`, `llc`, `ltd`, ...) and punctuation, a materially
  richer transformation purpose-built for fuzzy company-identity
  matching (`matcher/entityMatcher.ts`). **Not touched this milestone**
  — a real, deliberate divergence, not neglect.

**A finding beyond what either prior document named:** `lib/research/utils/normalization.ts`'s
own `normalizeUrl()` — the *original*, most sophisticated URL normalizer
in the codebase — strips tracking-parameter prefixes (`utm_`, `ref`,
`fbclid`, `gclid`) and normalizes hash/path/query, none of which any
downstream platform's simpler `urlDedupeKey()` does. Because
`normalizeUrl()` was never part of `lib/research`'s public barrel, every
downstream platform wrote a strictly *simpler* substitute rather than
reusing (or even matching) the more correct original. **This means two
URLs differing only by a tracking parameter are NOT deduplicated by any
of the five downstream platforms today** — a real, latent gap. **Not
fixed this milestone** (Non-Goals) — fixing it would change deduplication
*behavior* in five frozen platforms, which is a different, larger, and
separately-justified change than relocating already-identical code
without altering what it computes.

### Consumer & Dependency Audit

Confirmed via grep: none of `lib/verification/`, `lib/pipeline/`,
`lib/analysis-session/` duplicate any of these helpers — the debt is
scoped exactly to the five knowledge platforms, as
`ARCHITECTURE_REVIEW.md` described. `lib/shared/` does not exist.

### An alternative candidate, considered and set aside: Decision's own
unwired output layer

`lib/decision/` contains four fully-built, already-tested reshaping
functions with **zero external callers**, confirmed via grep:
`buildInvestmentMemo()` (`memo/`), `buildDueDiligenceReport()`
(`diligence/`), `buildExecutiveSummary()` (`executive/`),
`aggregateRecommendations()`/`sortRecommendationsByPriority()`
(`recommendations/`). This looks, at first glance, like the exact same
"built but never wired" shape Milestones 16–19 each closed — but reading
`DECISION_PLATFORM.md`'s own "Future Consumers" section shows why it
isn't the same kind of gap: each of these is explicitly named as its
**own future milestone** (Investor Reports, Due Diligence, Investment
Memo, Executive Summary — four distinct named future products, not one
"Decision Intelligence Depth" job). Wiring any one of them requires
first deciding *which* downstream product to build and *what* new route
or page consumes it — a product-scope decision this design investigation
has no mandate to make unilaterally, unlike Milestones 16–19, where the
target (`DecisionProfile` itself) was never in question. **Set aside for
a future milestone that explicitly picks one of these four products as
its subject** — not addressed here.

### PRODUCT_BACKLOG.md's own gating condition is now satisfied — noted,
not acted on

`PRODUCT_BACKLOG.md` explicitly gates itself: *"This backlog... exists
only as a product roadmap to execute **after** the current milestone
roadmap (Research → Competitor → Market → Financial → Business →
Decision Intelligence) is complete."* Every platform in that named list
is now built (Decision Intelligence itself was Milestone 10, predating
Milestones 16–19's depth work). Under any reasonable reading, this
precondition is now met. **This is worth recording plainly, but it does
not make `PRODUCT_BACKLOG.md` this milestone's subject** — its own
items (Analysis Experience, Trust & Evidence, deeper
Competitor/Market/Financial UI, the Startup Builder pipeline, Dashboard
UX, Reports) are each substantial, multi-file, product-surface
undertakings requiring their own dedicated design process, not a single
bounded architectural decision this document can respons‌ibly cover
alongside a utility-consolidation milestone. Recorded here so the next
milestone's design phase starts from this confirmed fact rather than
re-deriving it.

### Stale documentation identified

- **`ARCHITECTURE_REVIEW.md`'s own Technical Debt #1 recommendation**
  names its trigger condition directly: *"before or during Investor
  Intelligence, extract a small, explicitly frozen `lib/shared/`..."*
  Investor Intelligence is the very next named future consumer across
  every platform's own roadmap section (`BUSINESS_PLATFORM.md`,
  `DECISION_PLATFORM.md`). This milestone sits at exactly that trigger
  point.
- **`DECISION_PLATFORM.md`'s own "Also on the roadmap" section**
  independently names the same debt: *"this platform adds a fifth copy
  of each, exactly the pattern that review recommended addressing before
  it compounds further."*
- **`ARCHITECTURE_REVIEW.md`'s Technical Debt #2** (`ARCHITECTURE.md`/
  `CLAUDE.md`'s Folder Rules stale relative to six platforms of new
  architecture) is confirmed still accurate — `CLAUDE.md`'s own Section
  4 (Folder Rules, read as this project's binding instructions) still
  makes no mention of `lib/research/`, `lib/competitors/`, `lib/market/`,
  `lib/financial/`, `lib/business/`, `lib/decision/`, `lib/verification/`,
  `lib/pipeline/`, or `lib/analysis-session/` anywhere. **Not fixed this
  milestone** — a documentation-only fix with a different shape and
  review process than a code change, and bundling it here would mix two
  independently-justified corrections into one diff. Named in Future
  Growth as the natural next small, low-risk fix.

---

## 1. Purpose

Extract the genuinely byte-identical (Tier 1) and same-simple-policy
(Tier 2) pure utility functions — `dedupeByKey`, `urlDedupeKey`,
`dedupeByUrl`, `normalizeLabel` — into a new, explicitly frozen
`lib/shared/` module, at the exact point two independent existing
documents (`ARCHITECTURE_REVIEW.md`, `DECISION_PLATFORM.md`) already said
this debt should be paid: before a sixth knowledge platform
(Investor Intelligence, or whatever comes next) writes a sixth copy of
each. **Zero existing, frozen platform is modified.**

## 2. Product Vision

> A codebase's tenth new module reusing a battle-tested primitive is a
> sign of good architecture. A codebase's tenth new module *reinventing*
> that primitive because nowhere correct to import it from ever existed
> is a sign the architecture stopped scaling exactly where it should
> have started sharing. This milestone exists so the sixth platform
> doesn't have to make that choice.

## 3. User Questions

**None.** This is the first milestone in this sequence that answers zero
new user-facing question — it is debt reduction, not a capability. Every
prior milestone's User Questions section named at least one thing a
founder could now learn from Atlas AI; this one names none, honestly,
rather than manufacturing one. See Product Readiness (Section 23).

## 5. Architectural Discovery

Restated plainly: Milestones 16–19 closed the entire "upstream knowledge
platform not reaching `DecisionProfile`" problem class — verified in this
investigation, not assumed, by confirming all five of Decision's
consumed platforms (Research, Competitors, Market, Financial, Business)
now have their real, discovered output reaching `DecisionProfile` in
some honestly-documented form. **That problem class is closed.** The
next real, independently-documented (twice), and now-triggered
architectural problem is Technical Debt #1: the small set of pure helper
functions every knowledge platform had to reimplement for itself because
none of them was ever part of an upstream platform's public barrel. This
is a genuinely different *kind* of problem — not a data-reachability gap,
but a code-duplication-compounding-with-each-new-platform gap — and this
design's own Tier 1/2/3 analysis (Section 4) refines, rather than
blindly accepts, the prior review's grouping of what's actually safe to
consolidate.

## 6. Knowledge vs Observation

**Not applicable.** This milestone touches no knowledge-platform profile,
no accumulation semantics, and no notion of durable-vs-temporal data.
`dedupeByKey`/`urlDedupeKey`/`normalizeLabel` are pure, stateless
functions with no concept of "knowledge" at all — they transform a value
into a comparison key and return it; called twice with the same input,
they always produce the same output. Stated explicitly rather than
force-fitting this section, per the instruction not to copy a prior
milestone's template as if every section must apply.

## 7. Identity Model

**Not applicable**, for the same reason as Section 6 — there is no
knowledge record here to have an identity, and nothing to accumulate
against. `lib/shared/` will hold pure functions, never a store, a
schema, or a profile.

## 8. Discovery Strategy

**Not applicable in the usual sense.** No discovery process changes.
Every platform's own `discoverX()` function keeps calling exactly what
it already calls, computing exactly what it already computes — this
milestone changes *where a function's source code lives* for any *future*
platform, never *what* any *existing* platform computes or how.

## 9. Evidence Strategy

**Not applicable.** No evidence model touched. `dedupeByKey`'s
`Source`/`Evidence`-deduplication *callers* (each platform's own
`profileMerger.ts`) are unchanged; only a future platform would import
the shared version instead of writing its own sixth copy.

## 10. Confidence Strategy

**Not applicable, and deliberately not extended to cover
`computeDiscoveryConfidence`.** Considered directly (Section 4, Tier 3)
and rejected: the three existing implementations are not the same shape,
and forcing them into one function would be an premature, over-general
abstraction with no real second caller shaped like it. Confidence
computation semantics are entirely unchanged by this milestone,
everywhere.

## 11. Decision Relationship

**No `lib/decision/` schema, engine, or profile-merging code changes.**
`lib/decision/utils/dedupeByKey.ts` and `lib/decision/utils/urlNormalization.ts`
remain exactly where they are and exactly as they are — this milestone
does not retrofit any of the five frozen platforms, including Decision
itself, to import from the new module. Decision is affected by this
milestone in exactly the same (zero) way as Competitors, Market,
Financial, and Business are.

## 12. Verification Relationship

None. `lib/verification/` never duplicated any of these helpers
(confirmed, Pre-Design Verification) and is untouched.

## 13. Pipeline Relationship

None. `lib/pipeline/` never duplicated any of these helpers and is
untouched.

## 14. Data Flow

Not a runtime data-flow diagram this time — there is no new request path.
Instead, the change this milestone makes is to **source-code
organization**, and only for code that does not exist yet:

```
BEFORE this milestone:
  lib/market/utils/{dedupeByKey,urlNormalization,textNormalization}.ts     (own copies)
  lib/financial/utils/{dedupeByKey,urlNormalization,textNormalization}.ts  (own copies)
  lib/business/utils/{dedupeByKey,urlNormalization,textNormalization}.ts  (own copies)
  lib/decision/utils/{dedupeByKey,urlNormalization}.ts                    (own copies)
  lib/competitors/utils/urlNormalization.ts                               (own copy)
  → a hypothetical sixth platform would write a SEVENTH copy of each.

AFTER this milestone:
  lib/shared/  (NEW — explicitly frozen, zero current importers)
    ├── dedupeByKey.ts        ← Tier 1, byte-identical, extracted verbatim
    ├── urlNormalization.ts   ← Tier 1 (urlDedupeKey + dedupeByUrl wrapper)
    └── textNormalization.ts  ← Tier 2 (normalizeLabel)

  lib/market/, lib/financial/, lib/business/, lib/decision/, lib/competitors/
    → UNCHANGED. Still import their own local copies. Not retrofitted.

  A future sixth platform
    → imports from lib/shared/ instead of writing a seventh copy.
```

**No existing platform's import statements change. No existing
platform's behavior changes. `lib/shared/` has zero real callers at the
end of this milestone** — the same honestly-documented, not-yet-consumed
shape every knowledge platform's own facet folders had at their own
founding milestone (Competitors/Market/Financial/Business's
`positioning/`, `moat/`, `economics/`, etc. were all built with zero
real callers too, each clearly documented as such).

## 15. Information Flow

Not applicable in the usual sense — no evidence, source, or claim trail
is affected. The only "information" this milestone moves is: where a
future engineer should look to find the canonical version of
`dedupeByKey`/`urlDedupeKey`/`normalizeLabel`, instead of writing a new
copy by habit.

## 16. Risks

- **`lib/shared/` could be mistaken for a mandate to retroactively
  refactor the five frozen platforms.** Mitigated by this design's
  explicit, repeated statement that no frozen platform is touched — a
  future milestone would need its own separate authorization to migrate
  existing call sites, and doing so is **not** implied or requested by
  this one.
- **A reader might expect the tracking-parameter URL-normalization gap
  (Section 4) to be fixed here, since it's adjacent to what this
  milestone touches.** It is not — fixing it changes deduplication
  *behavior*, not just code location, in five frozen platforms
  simultaneously, which is a materially different and larger change.
  Named explicitly as a real, latent gap and explicitly deferred (Section
  18).
- **A reader might expect `computeDiscoveryConfidence()` to have been
  consolidated too**, since `ARCHITECTURE_REVIEW.md` grouped it with the
  others. Mitigated by Section 4's direct, evidenced rebuttal of that
  grouping.
- **Zero present-day behavior change anywhere** — this milestone is, by
  design, entirely inert until a platform that doesn't exist yet imports
  from it. The value is real but deferred, which is unusual for this
  project's prior milestones (each of which changed `DecisionProfile`'s
  observable shape immediately).

## 17. Design Deviations

None found requiring a code fix this milestone. The tracking-parameter
URL-normalization gap (Section 4) is a genuine, verified, real defect in
spirit — but "fix five frozen platforms' deduplication behavior" is a
different, larger, and separately-justified change than "relocate
already-identical code without changing what it computes," so it is
recorded as a Non-Goal (Section 18) and Design Debt (Section 22), not
folded into this milestone's Definition of Done as a deviation fix, the
way `hasMarketIndustry` was folded into Milestone 17's Design Deviation
section. The difference: that bug lived inside code this milestone was
already rewriting; this one lives inside code this milestone
deliberately does not touch.

## 18. Non-Goals

- Does not modify any of the five existing knowledge platforms
  (`lib/competitors/`, `lib/market/`, `lib/financial/`, `lib/business/`,
  `lib/decision/`) — no import statement in any of them changes.
- Does not extract `computeDiscoveryConfidence()` (Tier 3 — genuinely
  different shapes per platform, not safe to force into one function).
- Does not extract or replace `normalizeCompanyName()`/`tokenizeCompanyName()`
  (deliberately richer than `normalizeLabel`, single-owner, correctly
  divergent).
- Does not fix the tracking-parameter URL-normalization gap (Section 4)
  — a real finding, explicitly deferred as a larger, behavior-changing,
  separately-justified future fix.
- Does not update `ARCHITECTURE.md`/`CLAUDE.md`'s stale Folder Rules
  (Technical Debt #2) — a documentation-only fix with its own review
  shape, named in Future Growth, not bundled into this code-only
  milestone.
- Does not wire `buildInvestmentMemo`/`buildDueDiligenceReport`/
  `buildExecutiveSummary`/`aggregateRecommendations` into any consumer —
  each is its own future, product-scope milestone (Section 4).
- Does not act on `PRODUCT_BACKLOG.md` (Section 4) — noted as now
  in-scope by its own gating condition, but not this milestone's subject.
- Does not introduce an LLM call anywhere (Deterministic Reasoning,
  below — trivially true; nothing here involves reasoning of any kind).

## 19. Complexity Review

- **The core question this review had to answer: does creating a module
  with zero current callers count as premature abstraction?** Weighed
  directly against `CLAUDE.md`'s "don't design for hypothetical future
  requirements." Resolved by precedent already established across five
  prior platform-launch milestones (Competitors/Market/Financial/
  Business), each of which built multiple facet folders with zero real
  callers at their own founding, clearly documented as such — this
  project already accepts "correctly built, not yet consumed, honestly
  labeled" as a legitimate state, not just for knowledge platforms but
  for their own internal structure.
- **Whether to force `computeDiscoveryConfidence()` into one shared
  function was directly challenged and rejected** (Section 4/10) — real
  duplication in spirit is not sufficient justification when the actual
  shapes differ; forcing them together would be the over-generalization
  `CLAUDE.md` warns against, not the simplification it asks for.
- **Whether to also fix the tracking-parameter gap while touching this
  code was directly challenged and rejected** (Section 4/16/18) — real,
  but a different, larger, behavior-changing class of fix.
- **Whether to also update `ARCHITECTURE.md` in the same pass was
  directly challenged and rejected** (Section 4/18) — related in root
  cause, but a differently-shaped, documentation-only change deserving
  its own small, separate review.

## 20. Performance Review

- **Computational hotspots:** none — this milestone adds new files with
  zero current call sites; runtime performance of every existing
  platform is completely unaffected.
- **Cache opportunities:** none applicable.
- **Scaling risks:** the opposite of a risk — this milestone exists
  specifically to prevent a scaling risk (a seventh, eighth copy of the
  same primitives compounding indefinitely) from materializing at the
  next platform.

## 21. Observability

- **Runtime behavior:** none observable yet — `lib/shared/` has no
  runtime callers until a future platform imports it.
- **Debugging entry points:** `lib/shared/dedupeByKey.ts`,
  `lib/shared/urlNormalization.ts`, `lib/shared/textNormalization.ts`
  themselves — the natural place a future engineer looks first before
  writing a new copy.
- **Quality indicator:** whether a future sixth platform's own
  `utils/` folder contains zero reimplementations of these three
  functions — the direct, checkable signal that this milestone achieved
  its purpose.
- **Verification approach given zero runtime callers:** a temporary
  scratch script exercising each shared function directly against a
  handful of inputs, asserting identical output to what the five
  existing platforms' own (untouched) copies already produce for the
  same inputs — proving the extraction is behavior-preserving before any
  future platform ever depends on it.
- **Failure indicator:** any future platform's `utils/` folder containing
  a new `dedupeByKey.ts`/`urlNormalization.ts`/`textNormalization.ts`
  instead of importing `lib/shared/`'s version would indicate this
  milestone's purpose wasn't achieved — worth a one-line check the next
  time a sixth platform's own design is reviewed.

## 22. Design Debt

1. **The five existing platforms still each carry their own copy** —
   this milestone does not retire any of them; a future, separately-
   authorized migration milestone could do so, but isn't proposed here.
2. **`computeDiscoveryConfidence()`'s three divergent shapes remain
   unconsolidated** — correctly so per Section 4's analysis, but worth
   revisiting if a fourth/fifth shape ever appears and a genuine common
   pattern emerges (not forced prematurely here).
3. **The tracking-parameter URL-normalization gap** (Section 4) remains
   real and unfixed in all five platforms — named, not fixed.
4. **`ARCHITECTURE.md`/`CLAUDE.md`'s stale Folder Rules** (Technical Debt
   #2) remain stale — named, not fixed, this milestone.

## 23. Product Readiness

Honest assessment: this milestone changes nothing a founder using Atlas
AI would ever observe. Its entire value is to the *next* engineer (human
or AI) who builds a sixth knowledge platform — they now have one correct
place to import `dedupeByKey`/`urlDedupeKey`/`normalizeLabel` from
instead of a documented habit of writing a new copy. This is real,
deliberate infrastructure investment, not a capability, and this section
says so plainly rather than overstating it.

## 24. Future Growth

- **The next knowledge platform** (Investor Intelligence, or whatever is
  actually built next) imports from `lib/shared/` instead of writing a
  sixth/seventh copy — the entire reason this milestone exists.
- **`ARCHITECTURE.md`/`CLAUDE.md`'s Folder Rules update** (Technical Debt
  #2) is the natural next small, low-risk, documentation-only fix,
  sharing this milestone's root cause but deliberately not bundled into
  it (Section 19).
- **A future, separately-authorized migration** of the five existing
  platforms onto `lib/shared/` could retire Design Debt item #1 above,
  but is explicitly not requested or implied by this design.
- **If a fourth or fifth shape of `computeDiscoveryConfidence()`-style
  averaging ever appears**, revisit whether a genuine common pattern has
  emerged (Design Debt #2) — not before.

## 25. Definition of Done

1. New folder `lib/shared/` (explicitly frozen on creation, the same
   discipline every other platform's own foundational milestone
   followed) containing exactly three files:
   - `dedupeByKey.ts` — `dedupeByKey<TItem>(items, keyFn)`, extracted
     verbatim (byte-identical logic) from any of the four existing
     copies.
   - `urlNormalization.ts` — `urlDedupeKey(rawUrl)` and the
     `dedupeByUrl<TItem extends { url: string }>(items)` wrapper,
     extracted verbatim.
   - `textNormalization.ts` — `normalizeLabel(label)`, extracted
     verbatim (byte-identical logic to `lib/business`'s/`lib/financial`'s
     copies; same logic as `lib/market`'s `normalizeIndustryName` under
     a shared, generic name).
2. A `lib/shared/index.ts` public barrel exporting all three, matching
   this project's "one schema/function per shape, reused via public
   barrel" discipline.
3. **Zero changes to any of the five existing knowledge platforms** —
   `git status --short` must show only new files under `lib/shared/`.
4. A verification pass (temporary scratch script, deleted before final
   build) proves each new shared function produces identical output to
   its five existing counterparts for the same representative inputs.
5. `tsc --noEmit`, `eslint`, `next build` all clean.
6. Nothing committed until explicitly requested.

---

## Deterministic Reasoning

Trivially satisfied — this milestone involves no reasoning, judgment, or
synthesis of any kind, LLM-assisted or otherwise. It relocates three
already-deterministic, already-tested pure functions into a new home;
every input this milestone's own verification pass exercises has exactly
one correct output, unconditionally. There is no future-work angle for
LLM involvement here at all, unlike every knowledge-platform milestone
before it — worth stating plainly rather than manufacturing a "future
work" note where none applies.

---

*End of design specification. Awaiting review before any implementation
begins.*
