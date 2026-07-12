# Atlas AI — Milestone 19 Design Specification

**Business Intelligence Depth: Widening a Narrow Window Without Breaking
What Already Looks Through It**

Status: **Design only. No code, no folders, no source files exist yet.**

Milestones 1–18 are complete and frozen. This document was produced by
first determining what Milestone 19's real architectural problem *is* —
not by assuming it repeats Milestones 16–18's shape. The investigation
below found a materially different problem than "wire a fully-absent
platform in": Business Intelligence is **already partially wired**, and
the real question this milestone answers is whether to widen that
existing, live wiring — and how to do so without duplicating or breaking
it.

---

## 4. Pre-Design Verification

Every claim below is grounded in a direct read of the current codebase,
not memory.

**Read in full:** `BUSINESS_PLATFORM.md`, `PRODUCT_BACKLOG.md`,
`ARCHITECTURE.md`, `ARCHITECTURE_REVIEW.md`, `MILESTONE_16_DESIGN.md`,
`MILESTONE_17_DESIGN.md`, `MILESTONE_18_DESIGN.md`.

**Read directly, file by file:** `lib/decision/schemas/decision.schema.ts`
(current, post-Milestone-18), `lib/decision/schemas/businessSummary.schema.ts`,
`lib/decision/engine/decisionEngine.ts`, `lib/decision/engine/decisionProfileBuilder.ts`,
`lib/decision/engine/profileMerger.ts`, `lib/decision/confidence/decisionConfidence.ts`,
`lib/decision/types/confidence.ts`,
`lib/business/index.ts`, `lib/business/schemas/business.schema.ts`,
`lib/business/schemas/moat.schema.ts`, `lib/business/schemas/health.schema.ts`,
`lib/business/schemas/enums.ts`, `lib/business/knowledge/businessDiscovery.ts`,
`lib/business/knowledge/businessProfileBuilder.ts`,
`lib/business/knowledge/profileMerger.ts`, `lib/business/types/storage.ts`,
`lib/pipeline/stages/business.ts`, `lib/verification/buildVerificationSummary.ts`,
`components/workspace/decision-report/DecisionSummaryPanel.tsx`.

**Grep-verified, not assumed:** every consumer of
`DecisionProfile.strengths`/`.weaknesses`/`.opportunities`/`.threats`,
every consumer of `DecisionProfile.businessSummary`, every consumer of
`keyCompetitors`/`marketProfile`/`financialProfile` (the three fields
Milestones 16–18 added), every caller of `discoverBusiness()`, and every
mention of "business" in `ARCHITECTURE.md`/`ARCHITECTURE_REVIEW.md`.

### Knowledge Platform Audit

`lib/business/` is the largest platform yet — seventeen folders. Every
facet beyond `model/`'s reused passthrough (`businessModel`,
`customerSegments`, `revenueStrategy`) is a documented, honest
architecture-only placeholder: `positioning/`, `moat/`, `gtm/`,
`growth/`, `execution/`, `risk/`, `profile/`'s SWOT-and-health all return
empty arrays / absent optional fields today, verified directly by
reading `businessProfileBuilder.ts` and the schemas backing each field
(`EconomicMoatSchema`, `BusinessHealthSchema` — every field optional,
none defaulted). `scoring/` mirrors the other three platforms' neutral-50
placeholder scoring. `recommendations/` is construction-only, no
generation logic. This matches `BUSINESS_PLATFORM.md`'s own description
exactly — no drift found here.

### Usage Audit

`knowledge/businessDiscovery.ts`'s `discoverBusiness()` calls
`runResearch()`, `discoverCompetitors()`, `discoverMarket()`,
`discoverFinancials()`, and `buildBusinessProfile()` — never
`mergeBusinessProfile()`, never `BusinessKnowledgeStore`. Grep-confirmed:
**zero** call sites of `mergeBusinessProfile` or `lib/business`'s own
`createStore()` exist anywhere outside `lib/business/` itself — the
identical "built but never wired" shape found for Competitors (M16),
Market (M17), and Financial (M18), now confirmed a fourth time.

### Consumer & Dependency Audit — the actual discovery

This is where Milestone 19's real problem surfaced, and where the
investigation diverged from a simple fourth repeat of M16–18.

**`discoverBusiness()` is already called by `lib/decision/engine/decisionEngine.ts`
and `lib/pipeline/stages/business.ts`** — confirmed by direct read.
Unlike Financial before Milestone 18, Business's discovery output is
**not absent** from `DecisionProfile` today. But reading
`decisionEngine.ts`'s exact `buildDecisionProfile()` call site shows what
actually reaches `DecisionProfile`:

```
businessSummary: {
  businessModel: businessDiscovery.profile.businessModel,
  valueProposition: businessDiscovery.profile.valueProposition,
  customerProblem: businessDiscovery.profile.customerProblem,
  competitivePosition: businessDiscovery.profile.competitivePosition,
  overallHealth: businessDiscovery.profile.overallHealth,
},
strengths: businessDiscovery.profile.businessStrengths,
weaknesses: businessDiscovery.profile.businessWeaknesses,
opportunities: businessDiscovery.profile.businessOpportunities,
threats: businessDiscovery.profile.businessThreats,
```

Five scalar-ish fields plus four SWOT arrays. `BusinessProfileSchema`
has **twenty-two** fields. The twelve that never reach `DecisionProfile`
in any form today: `revenueStrategy`, `goToMarketStrategy`,
`distributionChannels`, `growthStrategy`, `growthDrivers`,
`expansionOpportunities`, `competitiveAdvantages`, `economicMoat`,
`executionComplexity`, `keyDependencies`, `operationalRisks`,
`customerSegments`.

**This is a different shape of gap than Milestones 16–18 found.**
Those three added a field that was **entirely absent** — `keyCompetitors`,
`marketProfile`, `financialProfile` didn't exist on `DecisionProfile`
before their milestone. Business is not absent — `businessSummary` and
the top-level SWOT fields have existed since Milestone 10, predating the
"give Decision the full upstream object" pattern entirely. Milestone 19's
real question is not "should this be wired in" (it partly already is) but
**"should the narrow, five-field-old window be widened to the full
object, and if so, what happens to the window that's already there and
already has a live reader?"**

**The live reader, confirmed by direct read:**
`components/workspace/decision-report/DecisionSummaryPanel.tsx`
destructures `businessSummary, investmentThesis, keyFindings,
criticalRisks, strengths, weaknesses, opportunities, threats` directly
off `DecisionProfile` and renders all of them. This is the *only* real
consumer found — `SwotSection.tsx` and `OpportunitiesCard.tsx` (which
also reference `strengths`/`weaknesses`/`opportunities`) were grep-hits
but read in full and confirmed to import `AnalysisResult` from
`@/lib/schemas/analysis` and `useAnalysisStore` respectively — the
**legacy, orphaned `AIWorkspace` flow**, not `DecisionProfile`. They are
irrelevant to this investigation.

Also confirmed: **none of `keyCompetitors`, `marketProfile`, or
`financialProfile` (Milestones 16–18's own additions) are consumed
anywhere in `components/`, `lib/verification/`, or `app/` yet.** They are
backend-only so far — expected, since Roadmap Milestone 2 ("Surface the
full AI output") is still open. This confirms the established pattern:
adding a full-object field to `DecisionProfile` without also wiring it
into the UI is normal, incremental, in-scope work at this stage of the
roadmap, not a half-finished task.

### Ownership Audit

Unchanged: Business Platform owns synthesis of its own facets; Decision
owns combining five platforms' knowledge; Verification owns trust
presentation; Dashboard owns rendering. `lib/verification/buildVerificationSummary.ts`
reads only `profile.keyFindings`, `.criticalRisks`, `.decisionLimitations`,
`.openQuestions`, `.confidenceSummary`, `.sources` — none of the
per-platform full-object fields (`keyCompetitors`/`marketProfile`/
`financialProfile`) are read there today, and adding `businessProfile`
would not change that. Verification's "gets richer automatically" claim
from Milestones 16–18 is accurate for evidence/sources (which already
flow through `aggregateEvidence()`), not for the full per-platform
objects themselves — worth stating precisely rather than repeating the
prior milestones' framing by habit.

### A decisive finding: `mergeBusinessProfile()`'s own comment names a
third exclusion category, not just two

Direct quote, `lib/business/knowledge/profileMerger.ts`:

> Deliberately does NOT touch `economicMoat`, `overallHealth`, or
> `executionComplexity` — those are only ever recomputed by a future
> real-assessment module, never hand-merged, so a merge can never
> silently overwrite a real assessment with a stale one or vice versa.

This is **not** the same reasoning Financial's merger gave for excluding
`FinancialEstimate` fields (those are excluded because they are
*point-in-time observations* — a burn rate measured today isn't "more
evidence" of the same fact tomorrow). `economicMoat`/`overallHealth`/
`executionComplexity` are excluded because they are **recomputed
judgments** — the *output* of a future real-assessment process, which
must always be derived fresh from real inputs, never patched piecemeal.
This is actually the same category `mergeDecisionProfile()` itself
already uses for `confidenceSummary`/`decisionReadiness` ("always
recomputed... since they're derived facts about the merged whole, not
independent data to accumulate"). Section 6 treats this as a **third,
distinct category** from durable knowledge and temporal observation —
a real nuance this investigation found by reading the comment closely,
not something to skip past because M17/M18 already covered "knowledge
vs observation" as a two-way split.

### Stale documentation identified

- **`BUSINESS_PLATFORM.md`'s "Status: not wired into the application"
  line** — stale in exactly the partial way `FINANCIAL_PLATFORM.md`'s
  identical line was at Milestone 18: `discoverBusiness()` IS called by
  `decisionEngine.ts` and the pipeline today. The deep gap (full-object
  passthrough, accumulation) remains unclosed, but the literal sentence
  is no longer accurate.
- **`ARCHITECTURE_REVIEW.md`** — explicitly dated to "before starting
  Milestone 10" (confirmed by its own text). Everything it says about
  the `research ← competitors ← market ← financial ← business` DAG and
  "no layer bypassing another" for `discoverBusiness()`'s four direct
  upstream calls remains accurate and is reused, not re-derived, in
  Section 5 below. Its silence on `keyCompetitors`/`marketProfile`/
  `financialProfile`/any future `businessProfile` field is expected
  staleness (it predates all three), not a new finding.
- **`ARCHITECTURE.md`** — still describes the pre-Sprint-3-era `lib/services/`
  world; no new staleness found relevant to this milestone.
- **`PRODUCT_BACKLOG.md`** — unchanged since Milestone 18; its Priority 1
  items for Competitor/Market/Financial Intelligence remain the same
  post-roadmap items. It has **no dedicated "Business Intelligence"
  priority section** — worth noting plainly: this backlog, generated
  from real user testing of the *product surface*, never asked for
  deeper business-model output the way it explicitly asked for deeper
  competitor/market/financial output. This milestone's justification
  therefore rests on **architectural completeness** (Business is the
  last of five platforms Decision consumes, and the only one still
  exposing a narrow, pre-pattern subset), not on a backlog-driven user
  ask — an honest distinction to carry into Section 1/Section 18.

---

## 1. Purpose

Decide, with evidence rather than habit, whether `DecisionProfile` should
expose the full `BusinessProfile` — not just its five-field
`businessSummary` and four SWOT arrays — and if so, wire it in without
duplicating or breaking the one real, live consumer of the existing
narrow window (`DecisionSummaryPanel.tsx`).

## 2. Product Vision

> An investment committee doesn't ask for "the business model" in
> isolation — they ask about go-to-market, moat, execution risk, and
> growth levers together, because a strong business model with no
> defensible moat and high execution complexity is a different bet than
> the same model with a real moat and low execution complexity. Hiding
> eleven of a synthesized business's twenty-two known facets from the
> one place that's supposed to synthesize a decision is the gap this
> milestone closes.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| What's the go-to-market strategy and which channels? | If discovered — `businessProfile.goToMarketStrategy`/`.distributionChannels` reach `DecisionProfile`; still architecture-only/empty in this environment today. |
| Is there a defensible moat? | The *category the schema supports* — yes, always. The *actual assessment* — no, honestly absent (`economicMoat.type` unset). |
| How complex is execution, and what does it depend on? | No real value yet — `executionComplexity`/`keyDependencies` reach `DecisionProfile` but stay honestly empty. |
| What are the growth levers? | Same — reaches `DecisionProfile`, stays honestly empty today. |
| What already reached Decision before this milestone? | `businessModel`, `valueProposition`, `customerProblem`, `competitivePosition`, `overallHealth`, and the SWOT — unchanged, still there. |
| Does this duplicate the SWOT that's already on `DecisionProfile`? | Yes, deliberately — Section 7/16 explain why that's an accepted shape, not a bug. |

## 5. Architectural Discovery

Restated from Pre-Design Verification for the record: the DAG
`research ← competitors ← market ← financial ← business` and
`discoverBusiness()`'s four direct upstream calls (rather than trusting
`discoverFinancials()`'s own internal reuse of Market/Competitors/Research)
were already reviewed and confirmed correct in `ARCHITECTURE_REVIEW.md`
("Business consumes all four... correct, not a bypass"). This milestone
does not revisit that; it only touches how much of `discoverBusiness()`'s
*output* reaches `DecisionProfile`, never how `discoverBusiness()` itself
is computed.

**The core discovery, restated plainly:** Business is the fourth
platform to have its "built but never wired" accumulation layer
confirmed dormant — but it is the *first* of the four where the
`DecisionProfile`-facing window was already open, just narrow, before
this milestone's pattern (add the full object) existed. Milestones 16–18
each answered "should we add a new field" against a blank slate. Milestone
19 answers it against an existing, five-year-old, live-consumed field —
a materially harder version of the same question, and the reason this
design does not simply copy M18's shape.

## 6. Knowledge vs Observation

Three categories are now visible across this platform's own fields —
more than the two (durable knowledge / temporal observation) Milestones
17–18 needed:

**Durable, structural knowledge** — `businessModel`, `revenueStrategy`,
`goToMarketStrategy`, `distributionChannels`, `growthStrategy`,
`growthDrivers`, `expansionOpportunities`, `competitiveAdvantages`,
`customerSegments`. These describe *choices and structure*, not
metrics — a company doesn't have a different go-to-market strategy every
week the way it has a different MRR every week. **Unlike every
`FinancialEstimate` field (Milestone 18), nothing here is inherently
time-volatile.** If Business ever gains a real identity to accumulate
against (Section 7), these fields — unlike Financial's numeric
estimates — would tolerate genuine accumulation in principle.

**Recomputed judgments** — `economicMoat`, `overallHealth`,
`executionComplexity`. Excluded from `mergeBusinessProfile()` today, and
correctly so, but for a *different* reason than temporal observation:
these are the *output* of a future real-assessment process (the scoring
engine, once real) and must always be derived fresh from a profile's
current structural facts and real inputs — hand-merging one would risk
carrying forward a judgment computed from now-outdated structural facts.
This is the same reasoning `mergeDecisionProfile()` already applies to
its own `confidenceSummary`/`decisionReadiness`.

**Point-in-time observation** — **no field in `BusinessProfile` fits this
category.** Confirmed directly: there is no metric-like field here the
way `mrr`/`cac`/`burnRate` were on `FinancialProfile`. This is a genuine,
verified difference from Milestone 18's platform, not an assumption
carried over from it.

**Conclusion:** unlike Financial, Business's own fields are mostly
knowledge-shaped, not observation-shaped. **But this does not by itself
justify accumulation this milestone** — see Section 7. The blocker for
Business is identity, not field volatility, which is a different failure
mode than Financial had (Financial was blocked on both).

## 7. Identity Model

`lib/business/types/storage.ts`'s own comment states the finding
directly, independent of any comparison to Financial:

> `findByHealthRating` is the natural secondary index here (a
> `BusinessProfile` has no unique name/industry key of its own)

Verified independently: `BusinessKnowledgeStore` offers `getById`,
`findByHealthRating` (returns an array, exactly like Financial's
`findByFundingStage`), `list`, `upsert`, `delete` — no equivalent of
Competitor's name or Market's industry category. A `BusinessProfile`, like
a `FinancialProfile`, describes **one specific startup's own synthesized
reality** — two different fintech-payments startups don't share "the
same" business profile just because they're in the same industry, the
same way they don't share the same financial profile. The real identity
key `BUSINESS_PLATFORM.md`'s own Future Roadmap names is the same one
Financial named: *"API module exposes discoverBusiness/scoreBusiness
behind a thin route once Milestone 4 (Authentication) exists."*

**This lands on the same underlying blocker as Financial (Authentication-gated
per-project scoping), independently re-verified rather than assumed** —
worth being honest that the conclusion coincides, since Section 6 showed
the *reason a resolver would be safe* differs (Business's fields would
tolerate a real merge; Financial's mostly wouldn't), even though *whether
one can be built at all* lands in the same place for both. **No
resolver, no default store, no persistence wiring is introduced this
milestone**, for the same evidenced reason M18 gave: inventing a
substitute identity (e.g., fuzzy-matching idea text) risks merging two
unrelated startups' business realities, solves a problem no user-facing
backlog item asked for, and is real, un-mandated new matching logic.

## 8. Discovery Strategy

`discoverBusiness()` is unchanged. `decisionEngine.ts` already holds
`businessDiscovery` (from the existing `Promise.all`) — no new discovery
call is added. The only change is passing `businessDiscovery.profile`
through as a new, additional argument to `buildDecisionProfile()`, in
parallel with the existing hand-picked `businessSummary`/SWOT
construction, which stays exactly as it is.

## 9. Evidence Strategy

Unchanged. `businessDiscovery.profile.sources`/`.evidence` already feed
`aggregateEvidence()` (confirmed in Pre-Design Verification — this
predates Milestone 16). Adding `businessProfile` to `DecisionProfile`
exposes the *same* sources/evidence a second time, nested inside the full
object, mirroring exactly how `financialProfile.sources` sits alongside
the same sources already present in `DecisionProfile.sources`'s
aggregate — an accepted, pre-existing shape (aggregate view + per-platform
view, both legitimate, established before this milestone), not a new
duplication this design is introducing for the first time.

## 10. Confidence Strategy

**A real (non-vacuous) candidate checklist signal exists this time,
unlike Milestone 18** — `hasEconomicMoat: Boolean(businessProfile.economicMoat.type)`
would be honestly `false` on every `DecisionProfile` built today (since
`economicMoat.type` is never populated by any real call site), the same
honest-false shape `hasFundingStage` already has. **Considered and
deliberately not added this milestone.** Reasoning: a signal that is
uniformly `false` across every profile provides no *discriminating*
value today — it would lower every profile's computed `coverage`
percentage by the same fixed amount, which is different from
`hasCompetitorProfiles`/`hasMarketProfile`'s addition (Milestones 16/17),
where real variance existed at the moment each was added (some idea
searches genuinely found competitors or classified an industry; none
will genuinely populate an economic moat today, since no real assessment
methodology exists in any platform yet). Adding a checklist dimension
with zero achievable variance is exactly the kind of premature
abstraction the Complexity Review is required to challenge. Left as
named future work (Section 24), to be added once `strategy/moatSynthesis`
becomes a real assessment, not an architecture-only placeholder.

**No other `CoverageChecklist` change.** `businessSummary`'s three
existing coverage fields (`hasBusinessModel`, `hasValueProposition`,
`hasCustomerProblem`) are untouched — they already read from
`businessSummary`, not from the new `businessProfile` field, and stay
that way.

## 11. Decision Relationship

- **`DecisionProfileSchema` gains one new, additive field:
  `businessProfile: BusinessProfileSchema`** — reused verbatim from
  `lib/business`'s public barrel.
- **`decisionProfileBuilder.ts`'s `BuildDecisionProfileInput` gains
  required `businessProfile: BusinessProfile`** (required, since
  `discoverBusiness()` always produces one) — included verbatim in the
  returned object.
- **`decisionEngine.ts` passes `businessDiscovery.profile` directly** as
  `businessProfile` — no new function call, no new import beyond the
  type itself, since `businessDiscovery` is already computed.
- **`businessSummary` and the top-level `strengths`/`weaknesses`/
  `opportunities`/`threats` fields are NOT removed, renamed, or
  recomputed from `businessProfile`.** They remain hand-constructed
  exactly as `decisionEngine.ts` already builds them today. This is a
  deliberate, load-bearing decision (Section 16) — `DecisionSummaryPanel.tsx`
  is a real, live, currently-working consumer of exactly these fields,
  and this project's standing default ("Backward compatibility is the
  default assumption, not a special request" — `CLAUDE.md` Section 22)
  applies without needing separate authorization.
- **No `CoverageChecklist`/`CHECKLIST_SIZE` change** (Section 10).
  `profileMerger.ts` needs no change — its existing `{...existing, ...}`
  spread already carries any field not in its own
  `MergeDecisionProfileInput` through unchanged, exactly as it already
  does for `keyCompetitors`/`marketProfile`/`financialProfile`.

## 12. Verification Relationship

No changes to `lib/verification/`. `businessDiscovery.profile.sources`/
`.evidence` already reach `DecisionProfile.sources`/`.evidence` before
this milestone — nothing new flows through evidence aggregation as a
result of this change. `businessProfile` itself is not separately
exposed through `VerificationSummary` — a future Dashboard/Reports
concern, same Non-Goal shape as Financial's equivalent decision at M18.

## 13. Pipeline Relationship

Nothing changes. `lib/pipeline/stages/business.ts` calls
`discoverBusiness()` and only that — unchanged.

## 14. Data Flow

```
synthesizeDecision(request)
  │
  ├─ runResearch(...) / discoverCompetitors(...) / discoverMarket(...) /
  │  discoverFinancials(...) / discoverBusiness(...)     [unchanged, concurrent]
  │
  ├─ resolveCompetitorKnowledge(...) → keyCompetitors      [M16, unchanged]
  ├─ resolveMarketKnowledge(...) → marketProfile           [M17, unchanged]
  │  (no resolution step for Financial or Business — Sections 7/M18 Section 6)
  │
  ├─ aggregateEvidence([..., businessDiscovery.profile.sources, ...])  [UNCHANGED — already wired]
  │
  └─ buildDecisionProfile({
        ...,
        businessSummary: { ...hand-picked subset, unchanged... },     UNCHANGED
        strengths/weaknesses/opportunities/threats: ...unchanged...,  UNCHANGED
        financialProfile: financialDiscovery.profile,                 [M18, unchanged]
        businessProfile: businessDiscovery.profile,                   NEW — full object
      })
        │
        ▼
  DecisionProfile {
    ...,
    businessSummary,              ← narrow, curated, stable — DecisionSummaryPanel's contract
    strengths/weaknesses/...,     ← same SWOT, same values, top-level
    businessProfile: BusinessProfile,   ← NEW — the full record the above two are drawn from
  }
```

**Where business knowledge enters `DecisionProfile` now:** at two
points simultaneously — the existing narrow, hand-picked projection
(unchanged) and the new full object (additive). Both are populated from
the exact same `businessDiscovery.profile` value in the same
synthesis call; there is one source of truth (`BusinessProfile`, as
`lib/business` builds it), projected twice for two different audiences.

## 15. Information Flow

A reader tracing a business claim now has two equally valid, equally
honest entry points: the curated `businessSummary`/SWOT (already
integrated into the existing Decision narrative, already rendered) or
the full `businessProfile` (every field `lib/business` currently knows,
including the nine facets — GTM, growth, positioning, moat, execution,
risk — that never had *any* Decision-level representation before this
milestone). Both trace back to the same `Evidence`/`Source` records,
since both are views over one `BusinessProfile` object, not two
independently-sourced records.

## 16. Risks

- **Perceived duplication.** A reader encountering both
  `DecisionProfile.strengths` and `DecisionProfile.businessProfile.businessStrengths`
  holding identical values might read this as a bug. Mitigated by this
  design's own explicit documentation (Section 11) and by the precedent
  already established for `sources`/`evidence` (aggregate top-level +
  per-platform breakdown, both legitimate, both already in production
  since before this milestone).
- **A reader may expect `businessProfile` to accumulate like
  `keyCompetitors`/`marketProfile`, since Business's own fields (Section
  6) are mostly knowledge-shaped, unlike Financial's.** Mitigated by
  Section 7's explicit identity-blocker finding and by `refresh.refreshReason`
  staying `"initial_discovery"` (never `"scheduled"`) on every
  Decision-sourced `businessProfile`, an honest, checkable signal that no
  merge occurred.
- **Zero observable numeric/content change in this environment** — every
  newly-exposed field (`economicMoat`, `executionComplexity`,
  `keyDependencies`, `operationalRisks`, GTM/growth fields) stays exactly
  as empty as before this milestone; the only observable change is
  structural (the object now reaches `DecisionProfile` at all).
- **Redundant `discoverFinancials()`/`discoverMarket()`/`discoverCompetitors()`
  calls remain** inside `discoverBusiness()` itself, layered under
  Decision's own independent calls to the same four platforms — same
  Design Debt class carried since Milestone 9, not addressed here (out
  of scope — see Non-Goals).

## 17. Design Deviations

None found requiring a fix this milestone. Specifically checked and
cleared: `businessSummary`'s three `CoverageChecklist` signals
(`hasBusinessModel`, `hasValueProposition`, `hasCustomerProblem`) use a
bare `Boolean()` check each — unlike `hasMarketIndustry`'s pre-Milestone-17
bug, none of these three has a "never-undefined sentinel" problem:
`businessModel`/`valueProposition`/`customerProblem` are genuine
`string | undefined` fields with no `"unclassified"`-style always-truthy
placeholder value, so `Boolean()` is the correct, honest check for all
three. Verified directly against `businessProfileBuilder.ts`, which
explicitly sets `valueProposition`/`customerProblem` to `undefined`
(never a placeholder string) — confirming no repeat of the M17 bug class
exists here.

## 18. Non-Goals

- Does not add a `resolveBusinessKnowledge()`-style function, a default
  store, or any persistence wiring — no natural identity exists to
  resolve against (Section 7).
- Does not remove, rename, or recompute `businessSummary` or the
  top-level SWOT fields from `businessProfile` — they remain the stable,
  hand-picked contract `DecisionSummaryPanel.tsx` already depends on.
- Does not add a `hasEconomicMoat`/`hasBusinessProfile`-style
  `CoverageChecklist` signal (Section 10) — no signal with real,
  achievable variance exists today.
- Does not implement real positioning/moat/GTM/growth/execution/risk/SWOT
  synthesis, real scoring dimensions, or recommendation generation — all
  remain exactly as architecture-only as `BUSINESS_PLATFORM.md` already
  documents.
- Does not introduce an LLM call anywhere (Deterministic Reasoning,
  below).
- Does not touch `lib/pipeline/`, `lib/analysis-session/`,
  `lib/verification/`, any `app/`/`components/` file, or `discoverBusiness()`'s
  own four upstream calls.
- Does not address the redundant-discovery Design Debt (Section 16) —
  named, not fixed, consistent with Milestones 16–18's own scoping.

## 19. Complexity Review

- **The absent `resolveBusinessKnowledge()` was directly challenged and
  rejected**, for the same evidenced reason as Financial (Section 7) —
  not built, then removed; never built.
- **The candidate `hasEconomicMoat` checklist signal was directly
  challenged and rejected** (Section 10) — a real, non-vacuous, but
  currently zero-variance signal is still the wrong kind of complexity to
  add; "not vacuous" alone doesn't justify a new field, "provides real
  discriminating value" does, and this doesn't yet.
- **The strongest temptation this milestone had to resist:** collapsing
  `businessSummary` + top-level SWOT into `businessProfile` and updating
  `DecisionSummaryPanel.tsx` to read through the new field, on the theory
  that "one source of truth" demands it. Rejected directly: the existing
  fields are not a second *source* of truth (there is exactly one —
  `lib/business`'s own `BusinessProfile`) — they are a second, narrower
  *projection* of it, already load-bearing in a live component. Removing
  a working projection to satisfy an abstract tidiness preference, when
  no user-facing problem exists with the current duplication, would be
  exactly the kind of unrequested redesign `CLAUDE.md`'s Definition of
  Done prohibits ("no unrequested redesigns... no more, no less").
- **No new schema, no new store, no new file under `lib/business/`** —
  the smallest diff that satisfies "make the full BusinessProfile
  reachable," enriching `DecisionProfile` alone.
- **No LLM integration** — see Deterministic Reasoning below.

## 20. Performance Review

- **Computational hotspots:** none — `businessDiscovery.profile` is
  already computed by the existing `Promise.all`; this milestone adds a
  reference to an already-held object, not a new call.
- **Cache opportunities:** none applicable — no store to cache against
  (Section 7).
- **Scaling risks:** none introduced. No per-analysis store growth
  occurs for Business data, matching Financial's M18 conclusion exactly
  (for the same identity-blocker reason).

## 21. Observability

- **Runtime behavior:** `DecisionProfile.businessProfile` populates on
  every `synthesizeDecision()` call, always structurally complete,
  mostly empty in this environment (matching `businessSummary`'s
  existing observable emptiness).
- **Debugging entry points:** `lib/business/knowledge/businessDiscovery.ts`
  (how the profile was built), `lib/decision/engine/decisionEngine.ts`
  (how it reaches `DecisionProfile`) — no new file to look in.
- **Business quality indicators:** whether `businessProfile.economicMoat.type`/
  `.executionComplexity`/`.overallHealth.rating` carry a real value —
  today, no. The clearest signal of whether real strategic-assessment
  logic has started landing in `lib/business`'s facet folders.
- **Evidence quality indicators:** `businessProfile.sources.length`/
  `.evidence.length` — unchanged, already observable via `businessSummary`'s
  sibling aggregate today.
- **Confidence calibration indicators:** `businessProfile.confidence`
  (real, computed from Research + Market + Financial's own confidences,
  unchanged) continues to track the same inputs it always has.
- **Failure indicators:** `businessProfile.businessStrengths` (etc.)
  ever drifting from `DecisionProfile.strengths` (etc.) within the same
  `DecisionProfile` would indicate a genuine regression — both are built
  from the same `businessDiscovery.profile` in the same synthesis call
  and must always agree; worth a direct equality check during
  verification precisely because silent drift here would undermine
  Section 11's "one source, two projections" claim.

## 22. Design Debt

1. **No accumulation wiring exists for `BusinessProfile`** — reviewed,
   documented, deliberate deferral pending Authentication (Milestone 4),
   identical in kind to Financial's deferral (Section 7).
2. **Redundant discovery calls compound one layer deeper here than any
   other platform** — `discoverBusiness()` independently re-calls
   Research/Competitors/Market/Financial, and `decisionEngine.ts`
   independently calls all five again — the same class of debt named at
   Milestones 16–18, now confirmed to nest one level deeper for Business
   specifically.
3. **`businessSummary` and `businessProfile` will require deliberate,
   coordinated maintenance** if `discoverBusiness()`'s field set ever
   changes — both are built from the same source in the same call site,
   so they cannot silently drift apart today, but a future edit to
   `decisionEngine.ts` that changes one without the other would introduce
   exactly the drift Section 21's failure indicator watches for. Worth a
   comment at both call sites (implementation detail, not a design
   change).
4. **`MemoryBusinessStore` remains completely unwired**, matching
   Financial's identical storage-layer debt.

## 23. Product Readiness

Honest assessment: this milestone makes the full, structured business
picture — GTM, growth levers, moat category, execution complexity,
dependencies, operational risks — reachable from `DecisionProfile` for
the first time, without disturbing the narrower view already rendered in
production. It does **not** make any of that content real — every newly
exposed field stays exactly as architecture-only as `BUSINESS_PLATFORM.md`
already documented. `PRODUCT_BACKLOG.md` never asked for this
specifically (Pre-Design Verification); its value is closing an internal
architectural asymmetry (Business was the only one of five Decision
inputs still using a pre-pattern narrow window), not a direct response to
user testing.

## 24. Future Growth

- **Once real positioning/moat/GTM/growth/execution/risk synthesis
  exists**, `businessProfile`'s newly-exposed fields start carrying real
  content with zero further `lib/decision` schema changes needed — the
  same "absorbs future enrichment automatically" property
  `financialProfile` and `marketProfile` already have.
- **Once a real assessment methodology exists for `economicMoat`**, the
  `hasEconomicMoat`-style checklist signal named and deliberately not
  added in Section 10 becomes worth adding, since it would then have real
  variance across profiles.
- **Once Authentication (Milestone 4) exists**, a future milestone can
  give `BusinessProfile` (and `FinancialProfile`) a real per-project
  identity and build the accumulation wiring both currently lack, using
  the same resolver template Milestones 16/17 established.
- **What does not need to change:** `DecisionProfileSchema.businessProfile`'s
  shape (already `BusinessProfile`, reused verbatim) absorbs all of the
  above automatically.

## 25. Definition of Done

1. `DecisionProfileSchema` gains `businessProfile: BusinessProfileSchema`,
   imported from `lib/business`'s public barrel.
2. `decisionProfileBuilder.ts`'s `BuildDecisionProfileInput` gains a
   required `businessProfile: BusinessProfile`; the returned object
   includes it unchanged.
3. `decisionEngine.ts` passes `businessDiscovery.profile` as
   `businessProfile` into `buildDecisionProfile()` — no new function
   call, no new store, no new file anywhere under `lib/business/`.
4. `businessSummary` and the top-level SWOT fields are constructed
   exactly as they are today — byte-for-byte unchanged code at those
   specific lines.
5. No `CoverageChecklist`/`CHECKLIST_SIZE` change; `profileMerger.ts`
   requires no edits (verify this remains true at implementation time).
6. A verification scenario proves: (a) `businessProfile` reaches
   `DecisionProfile` end to end from a real `synthesizeDecision()` call,
   (b) `businessProfile.businessStrengths` equals
   `DecisionProfile.strengths` (and the same for weaknesses/opportunities/
   threats) within the same result, confirming the "one source, two
   projections" claim holds at runtime, not just in code, (c)
   `businessProfile.economicMoat`/`.executionComplexity`/`.keyDependencies`/
   `.operationalRisks` are present but honestly empty.
7. `tsc --noEmit`, `eslint`, `next build` all clean.
8. `git status --short` touches only `lib/decision/`.
9. Nothing committed until explicitly requested.

---

## Deterministic Reasoning

Every reason Milestones 17–18 gave still holds, unchanged: zero LLM
precedent anywhere in five platforms now (confirmed again this
milestone), an LLM's failure mode is confident fabrication rather than
honest absence, and introducing one is a bigger decision than a single
"Depth" milestone's mandate. Business Intelligence raises a specific new
angle: unlike a market trend or a financial figure, a *strategic
judgment* ("this business has a network-effects moat," "this is a
market leader") reads as expert analysis precisely because it sounds
qualitative and reasoned rather than numeric — arguably an *easier*
fabrication to produce and a harder one for a reader to challenge than a
fabricated number would be, since there's no obviously-checkable figure
attached to catch it against. This makes deterministic, honestly-absent
placeholders *more* important to hold onto here, not less, until a real
assessment methodology exists. Future work only: if `strategy/moatSynthesis`
or `profile/businessHealth` is ever LLM-assisted, it should be
LLM-*summarization of real, already-sourced signals* (e.g., real
competitor-differentiation data once available), never LLM-*generation*
of a qualitative judgment from the idea text alone — the same
distinction named as future work in `MILESTONE_18_DESIGN.md`.

---

*End of design specification. Awaiting review before any implementation
begins.*
