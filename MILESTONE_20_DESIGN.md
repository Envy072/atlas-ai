# Atlas AI — Milestone 20 Design Specification

**Competitor Intelligence Surfacing: Showing a Founder the Real,
Structured Data That's Already Been Computed**

Status: **Design only. No code, no folders, no source files exist yet.**

This is the corrected Milestone 20, selected by using `PRODUCT_BACKLOG.md`
as the primary source of milestone ordering, per explicit instruction.
The prior candidate (shared knowledge-platform utility consolidation) was
accepted as a real but non-urgent engineering debt item and preserved as
`ENGINEERING_BACKLOG_SHARED_UTILITIES.md` for a future Architecture
Stabilization phase — it is not this milestone.

---

## 4. Pre-Design Verification

### Re-reading PRODUCT_BACKLOG.md as the primary ordering source

`PRODUCT_BACKLOG.md`'s Priority 1 tier lists, in order: **Analysis
Experience**, **Trust & Evidence**, **Competitor Intelligence**,
**Market Intelligence**, **Financial Intelligence**, **Startup Builder**.
Rather than assuming the first-listed item is automatically still open,
each was checked directly against the current, live implementation.

**Analysis Experience — checked, already substantially closed.**
Every specific complaint (*"Cannot see the current analysis stage,"
"No progress timeline," "Cannot cancel analysis," "Cannot restart a
single stage," "No clear execution flow"*) was checked one by one
against `components/workspace/session/SessionProgressExperience.tsx`
(Milestones 14–15) and its supporting API routes:
- Stage visibility: a real stage stepper (`STAGE_ORDER`-driven `<ol>`)
  plus a `headline`/`Progress` bar — present.
- Cancel: a real `Cancel` button, wired to `onCancel`, gated on
  `CANCELLABLE_STATES` — present.
- Restart a single stage: `app/api/analysis-sessions/[id]/retry/route.ts`'s
  own comment states directly — *"Retries only the current failed
  stage, not the whole pipeline"* — present, and more precise than the
  backlog's own ask (a full restart would be the worse UX).
- Execution flow: the timeline list plus stage stepper together already
  narrate this.

**Conclusion: Analysis Experience is done.** This is not assumed from
the backlog item's absence elsewhere — it was verified directly against
the component and API route source.

**Trust & Evidence — checked, already substantially closed.**
Every specific complaint (*"Sources are not visible," "Facts are not
clearly referenced," "Confidence is difficult to trust," "unclear which
information is verified versus inferred"*) was checked against
`components/workspace/decision-report/TrustPanel.tsx` (Milestones 13–15):
sources render as a real, linked `Table` with per-source confidence and
retrieval date; four separate confidence dimensions render as stats;
**a dedicated "Verified claims" section is rendered separately from an
"Unverified / assumed" section** — directly answering the backlog's
"unclear which information is verified versus inferred" complaint by
construction, not by inference.

**Conclusion: Trust & Evidence is done.**

**Competitor / Market / Financial Intelligence — checked, genuinely
still open.** Grep-confirmed (again, as in Milestones 18–19's own
audits): **zero components anywhere render `keyCompetitors`,
`marketProfile`, or `financialProfile`** — `DecisionReport.tsx` renders
only `TrustPanel` and `DecisionSummaryPanel`, neither of which touches
these three fields. This is the first Priority 1 item that direct
verification, not assumption, confirms is genuinely unaddressed.

**Startup Builder — checked, out of scope for a single milestone.** This
backlog item describes a multi-stage pipeline (Execution Plan → Weekly
Tasks → Validation → MVP → Launch) with no existing schema or engine
anywhere in the codebase — a multi-milestone product initiative, not a
single bounded design.

### Choosing among the three open Intelligence items

`PRODUCT_BACKLOG.md` lists Competitor, Market, and Financial Intelligence
as three separate Priority 1 sections — not one. Milestones 16–19 each
built exactly one platform's depth at a time; this design applies the
same discipline to the surfacing side, rather than attempting all three
(plus Business, which the backlog doesn't even list separately but which
Milestone 19 also enriched) in one oversized diff. **Competitor
Intelligence is selected first**, for a concrete, checked reason, not
simply because it's listed first: its backing schema
(`CompanyProfileSchema`) already has direct structural matches for more
of the backlog's specific asks than Market's or Financial's schemas do
in areas that render simply (see below) — meaning this slice produces
the most immediately real (non-empty-shell) UI of the three. Market and
Financial Intelligence surfacing are named as the immediate next two
milestones in this exact sequence (Future Growth, Section 24).

### Schema-to-backlog gap analysis — read directly, not assumed

`lib/competitors/schemas/company.schema.ts`'s `CompanyProfileSchema` was
read in full. Matched against `PRODUCT_BACKLOG.md`'s exact Competitor
Intelligence asks:

| Backlog ask | Schema support | 
|---|---|
| "Pricing comparison" | ✅ `pricing: PricingSchema` (`model`, `startingPriceUsd`, `tiers[]`) — real structure, read in full |
| "Features comparison" | ✅ `features: string[]` |
| "Website links" | ✅ `website: string().url().optional()` |
| "Strengths and weaknesses with evidence" | ✅ `strengths`/`weaknesses: string[]`, plus `sources`/`evidence` on the same profile |
| "Market positioning" | ⚠️ Partial — `category` (`CompetitorCategorySchema`) exists but is a coarse classification, not a positioning narrative |
| "Customer complaints" | ❌ No field anywhere on `CompanyProfileSchema` captures this |
| "Customer reviews" | ❌ No field |
| "Why customers choose them" | ❌ No field |
| "Why customers leave" | ❌ No field |

**Four of the backlog's nine specific asks have no schema representation
at all.** This is stated plainly, not glossed over — rendering what the
schema has is real, honest progress; it is not a complete answer to the
backlog item, and this design does not pretend otherwise (Non-Goals,
Section 18).

### Consumer & Legacy Audit

`components/workspace/CompetitionCard.tsx` (the legacy, orphaned
`AIWorkspace` flow) was read directly for style precedent. It renders
only a single freeform prose paragraph (`analysis.competition`) from the
old `AnalysisResult` schema — **not a structural precedent for rendering
a list of `CompanyProfile` records**, since the legacy flow never had
structured per-competitor data at all. This confirms the new card is a
genuine product upgrade (structured, evidence-linked data replacing
prose), not a re-skin of existing functionality. The legacy component is
frozen and not touched by this milestone.

Available, reusable shared/ui primitives confirmed present and
sufficient — no new shared primitive is needed: `SectionHeader`,
`IconBadge`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/
`TableCell` (already the established pattern for `TrustPanel`'s sources
list), `Badge`, `EmptyState` (a shared empty-state primitive, confirmed
present, not yet used by any Decision-Report-family component).

### ARCHITECTURE_REVIEW.md / DECISION_PLATFORM.md — correctly treated as
supporting guidance only, not schedule

Per this milestone's explicit instruction, these are consulted only for
architectural correctness (layering, public-API discipline), not for
sequencing. Nothing in either document is treated as overriding
`PRODUCT_BACKLOG.md`'s own ordering here.

---

## 1. Purpose

Add a new, real UI surface — `CompetitorIntelligenceCard` — to the live
Decision Report, rendering `DecisionProfile.keyCompetitors` (the real,
structured, evidence-backed `CompanyProfile[]` Milestone 16 already
resolves and accumulates) in place of the current situation, where this
data is computed, stored, and then shown to nobody.

## 2. Product Vision

> `PRODUCT_BACKLOG.md`'s own words: *"Need much deeper competitor
> profiles. Pricing comparison. Features comparison. Website links...
> Strengths and weaknesses with evidence."* Every one of those exists
> today as real, validated data on `CompanyProfile` — pricing tiers,
> feature lists, a website URL, evidence-linked strengths/weaknesses.
> The gap isn't that Atlas AI doesn't know this; it's that nobody ever
> built the fifteen lines of JSX to show it.

## 3. User Questions

| Question | Answered after this milestone? |
|---|---|
| Who are the real, identified competitors for my idea? | Yes — `keyCompetitors[].name`/`.aliases`, rendered per company. |
| What do they charge? | If discovered — `pricing.model`/`.startingPriceUsd`/`.tiers[]`; often absent in this environment (no real competitor-data source configured), rendered honestly as absent, not fabricated. |
| What features do they have? | If discovered — `features: string[]`. |
| Where can I find them? | If discovered — `website`, rendered as a real link. |
| What are their strengths and weaknesses, and how do I know? | If discovered — `strengths`/`weaknesses`, each backed by the same company's own `sources`/`evidence`, rendered together (never a strength/weakness claim without its evidence link visible). |
| Do customers like them? Why do people switch away? | **No** — no field on `CompanyProfile` captures this; honestly out of scope (Non-Goals). |

## 5. Architectural Discovery

This is the **first UI-layer milestone in this sequence** — Milestones
13–19 were entirely `lib/` backend work (knowledge platforms, Decision
synthesis, Verification). Per `CLAUDE.md`'s own layering rules (Section
3), the correct home for this change is `components/workspace/decision-report/`,
never `lib/decision/` — `DecisionProfile.keyCompetitors` already exists
and is already schema-valid (Milestone 16); this milestone changes
nothing about how it's computed, resolved, or persisted. It only adds a
reader.

**A genuinely new rendering shape, not previously encountered in this
family of components:** `TrustPanel`/`DecisionSummaryPanel` each render
**one** object's fields. `keyCompetitors` is an **array** of zero-to-N
independent, structurally rich records — the first "render a list of
rich records, each with its own nested evidence" UI problem this project
has solved for the Decision Report. `TrustPanel`'s existing sources
`Table` is the closest precedent (a list of structurally uniform rows),
but a `CompanyProfile` has far more per-item structure (pricing tiers,
feature lists, SWOT, its own evidence) than a `Source` row does — a flat
table is very likely the wrong shape; see Section 16 for the actual
layout decision.

## 6. Knowledge vs Observation

**Not applicable.** This milestone touches no knowledge-platform
accumulation semantics — `CompanyProfile`'s own identity/merge/refresh
logic (Milestone 16) is completely unchanged. It only reads an
already-resolved array and renders it.

## 7. Identity Model

**Not applicable**, for the same reason — no new identity or
accumulation concept is introduced; each `CompanyProfile.id` is already
a stable key (used directly as a React list `key`), unchanged from
Milestone 16.

## 8. Discovery Strategy

**Not applicable.** `discoverCompetitors()`/`resolveCompetitorKnowledge()`
are entirely unchanged; this milestone consumes their already-produced
output.

## 9. Evidence Strategy

**The one strategy question genuinely relevant to this milestone.**
Each `CompanyProfile`'s own `sources`/`evidence` must render alongside
its `strengths`/`weaknesses` — never a bare claim with no way to check
it, mirroring `TrustPanel`'s own "never a claim without its evidence"
discipline (Milestone 14/`VerificationSummary`'s `verifiedClaims`
shape). This card does **not** re-aggregate evidence into
`VerificationSummary` — that aggregation already happened at Milestone
16 (`aggregateEvidence()` already includes every `keyCompetitors[].sources`).
This card is a second, additive *view* of the same already-aggregated
evidence, at the per-company level of detail `VerificationSummary`'s own
flattened view doesn't preserve — the same "one source, two projections"
shape Milestone 19 established for `businessProfile`/`businessSummary`.

## 10. Confidence Strategy

Each `CompanyProfile.confidence` renders as a simple stat per company
(reusing the same `formatPercent` helper `TrustPanel` already uses) — no
new confidence computation, no new aggregation, a direct passthrough of
an already-computed value.

## 11. Decision Relationship

**No `lib/decision/` change of any kind.** `DecisionProfile.keyCompetitors`
already exists (Milestone 16); this milestone adds a consumer, not a
producer. No schema, engine, or merger file is touched.

## 12. Verification Relationship

None. `VerificationSummary`'s own evidence aggregation already includes
every competitor's sources/evidence (Milestone 16, unchanged). This
card is a separate, additional, per-company presentation of a subset of
that same evidence — not a competing source of truth, per Section 9.

## 13. Pipeline Relationship

None. `lib/pipeline/` is entirely unaffected.

## 14. Data Flow

```
DecisionReport({ profile, verification })
  │
  ├─ TrustPanel({ verification })                    UNCHANGED
  ├─ CompetitorIntelligenceCard({ competitors: profile.keyCompetitors })   NEW
  └─ DecisionSummaryPanel({ profile })                UNCHANGED
```

`profile.keyCompetitors` (already present on every `DecisionProfile`
since Milestone 16) is passed straight through — no new prop threading,
no new data fetch, no new hook.

## 15. Information Flow

A founder reading the Decision Report can now trace a specific
competitor's strength/weakness claim down to the exact `Source`/`Evidence`
records Milestone 16 already attached to that company — a real,
checkable trail that did not reach the UI before this milestone, using
data that already existed.

## 16. Risks

- **Empty state is the common case in this environment** (no real
  search-provider credentials configured) — `keyCompetitors` will often
  be `[]`. This must render as an honest `EmptyState` ("No competitors
  identified yet"), never as an error or a missing section, mirroring
  `TrustPanel`'s own "No sources are attached to this analysis yet"
  convention.
- **Layout risk: a flat table is the wrong shape for N richly-structured
  companies.** Each `CompanyProfile` carries pricing tiers, a feature
  list, and its own SWOT+evidence — far more per-row content than
  `TrustPanel`'s source table has. The design decision (to be finalized
  at implementation, consistent with `CLAUDE.md` Section 9's card
  language) is a **per-company card within the section** (one
  `rounded-2xl` sub-card per competitor, stacked or in a responsive
  grid), not a table row — matching how `CLAUDE.md`'s own Section 9
  describes cards as the unit for structured, multi-field content, and
  reserving `Table` for genuinely tabular, uniform-row data the way
  `TrustPanel`'s sources list is.
- **Visual weight** — with several competitors each carrying pricing/
  features/SWOT, the section could become very long. A collapsed
  default state (mirroring `SessionProgressExperience`'s own `<details>`
  pattern for terminal-state timelines) is worth considering per
  company, finalized during implementation against real rendered output
  rather than decided speculatively here.
- **The four backlog asks with no schema support** (customer complaints/
  reviews, why-customers-choose/leave) might be expected by a reviewer
  comparing this card against the full backlog list. Mitigated by
  Section 4's explicit, direct schema-to-backlog table — nothing here is
  fabricated to appear complete.

## 17. Design Deviations

None found during this investigation. To be reconfirmed during
implementation once the actual component is built and run against real
(or honestly-empty) session data.

## 18. Non-Goals

- Does not render `marketProfile`, `financialProfile`, or
  `businessProfile` — named as the immediate next milestones in this
  same sequence (Section 24).
- Does not add any new field to `CompanyProfileSchema` or any other
  `lib/competitors/` file — customer complaints/reviews/switching
  reasons have no schema representation and are not fabricated to fill
  the gap.
- Does not modify `lib/decision/`, `lib/pipeline/`, `lib/verification/`,
  or `lib/analysis-session/` in any way.
- Does not touch the legacy `AIWorkspace`/`CompetitionCard.tsx` flow —
  frozen, orphaned, a separate concern (Milestone 1's still-open
  "unify the analyze-idea implementation" item, not this one).
- Does not redesign `TrustPanel.tsx` or `DecisionSummaryPanel.tsx` —
  additive only; `DecisionReport.tsx` gains one new child, its existing
  two children are untouched.
- Does not address Market/Financial Intelligence backlog items — each
  is its own next milestone.
- Does not implement Startup Builder — out of scope for a single
  milestone (Pre-Design Verification).

## 19. Complexity Review

- **Whether a new shared primitive is needed was directly challenged.**
  Rejected — `Table`, `Badge`, `IconBadge`, `SectionHeader`, `EmptyState`
  all already exist and are sufficient; per `CLAUDE.md` Section 11
  ("Promote to `components/shared/` at three repetitions"), a
  competitor-specific sub-card pattern used only once (this card) does
  not yet qualify for shared-primitive extraction — it stays local to
  `CompetitorIntelligenceCard.tsx` unless Market/Financial/Business's own
  upcoming cards reveal a genuinely repeated pattern (at which point
  Milestone 21/22/23 would be the natural point to extract it, per the
  project's own three-repetition rule).
- **Whether to build a generic "list of rich records" primitive now,
  anticipating Market/Financial/Business's own upcoming cards, was
  directly challenged and rejected** — exactly the "don't design for
  hypothetical future requirements" the engineering philosophy warns
  against; the next three cards may not share enough shape to justify
  one abstraction, and forcing one now would be guessing ahead of the
  three repetitions rule.

## 20. Performance Review

- **Computational hotspots:** none — rendering a small, already-fetched
  array (realistic competitor counts are single-digit); no new
  computation, no new network request.
- **Memoization:** none added by default, per `CLAUDE.md`'s "memoize
  with a reason, not by default" — nothing here has a measured cost.
- **Scaling risk:** none identified at realistic data volumes.

## 21. Observability

- **Runtime behavior:** the card renders directly from
  `DecisionProfile.keyCompetitors` — no new state, no new request
  lifecycle, no new hook.
- **Debugging entry points:** `components/workspace/decision-report/CompetitorIntelligenceCard.tsx`
  itself, and `lib/competitors`'s own `resolveCompetitorKnowledge()` if
  the underlying data looks wrong (unchanged, Milestone 16's own
  concern).
- **Quality indicator:** whether real competitor data (once a real
  search-provider is configured) renders pricing/features/website
  correctly — checkable manually against the dev server.
- **Failure indicator:** the card ever throwing on an empty
  `keyCompetitors` array, or on a `CompanyProfile` with every optional
  field absent, would indicate a missing-data-handling bug — the
  primary thing this milestone's runtime verification must check.

## 22. Design Debt

1. **Market/Financial/Business Intelligence remain unsurfaced** —
   named, immediate next milestones (Section 24), not a surprise gap.
2. **Four of the backlog's nine Competitor Intelligence asks have no
   schema support** (Section 4) — a real, larger, future backend gap
   (a "customer sentiment" data source would need its own knowledge-
   platform-style milestone), not something this UI-only milestone can
   close.
3. **A single-use competitor sub-card pattern lives locally in this
   file** rather than as a shared primitive — correct per the
   three-repetition rule today, but worth revisiting once Market/
   Financial/Business's own cards exist (Complexity Review, Section 19).

## 23. Product Readiness

Honest assessment: this milestone closes real ground on
`PRODUCT_BACKLOG.md`'s Competitor Intelligence Priority 1 item — pricing,
features, website, and evidence-linked strengths/weaknesses become
genuinely visible for the first time, using only real, already-computed
data. It does **not** close the item fully — customer sentiment data
(complaints, reviews, switching reasons) doesn't exist anywhere in the
codebase and isn't fabricated to appear otherwise. This is the first
milestone since 15 with a directly observable, user-facing change.

## 24. Future Growth

- **Market Intelligence surfacing** — the immediate next milestone in
  this sequence; `MarketProfile`'s own schema (`sizing`, `growthRate`,
  `geographicMarkets`, `regulations`, `trends`) already maps closely
  onto the backlog's Market Intelligence asks (TAM/SAM/SOM, growth,
  geographic breakdown, regulations, trends) — confirmed by direct read
  during this investigation, not yet designed.
- **Financial Intelligence surfacing** — `FinancialProfile`'s
  methodology-note-per-estimate shape (Milestone 18) directly answers
  the backlog's "CAC/LTV explanation" and "sources for every financial
  estimate" asks even while every value stays honestly absent.
- **Business Intelligence surfacing** — `BusinessProfile`'s newly
  Milestone-19-exposed fields (GTM, growth, moat, execution) have no
  direct `PRODUCT_BACKLOG.md` ask today, but would round out the same
  card family.
- **If a real "customer sentiment" data source is ever added**
  (Design Debt #2), this same card absorbs it automatically once
  `CompanyProfileSchema` gains the relevant fields — no structural
  change to this milestone's own component needed.
- **If a genuinely repeated per-record sub-card pattern emerges** across
  the next 2–3 UI-surfacing milestones, extract it to
  `components/shared/` at that third repetition (Complexity Review).

## 25. Definition of Done

1. New file `components/workspace/decision-report/CompetitorIntelligenceCard.tsx`
   — a single-responsibility presentational component taking
   `competitors: CompanyProfile[]` and rendering: an honest `EmptyState`
   when empty, otherwise one sub-card per company showing name/aliases,
   category, website (as a real link), pricing (model + tiers, when
   present), features, strengths/weaknesses (each paired with its own
   evidence), and a confidence stat — every optional field absent
   without fabricating a placeholder value.
2. `DecisionReport.tsx` renders `<CompetitorIntelligenceCard competitors={profile.keyCompetitors} />`
   as a new, additive child — `TrustPanel`/`DecisionSummaryPanel`
   untouched.
3. Reuses only existing shared/ui primitives (`Card`, `SectionHeader`,
   `IconBadge`, `Badge`, `EmptyState`) — no new shared primitive added
   (Complexity Review).
4. Zero changes anywhere under `lib/`.
5. Manually verified in the browser against the running dev server,
   per `CLAUDE.md`'s UI-testing requirement: both the empty-state path
   (realistic in this environment) and a populated path (via a
   temporary scratch fixture, deleted before final build) render
   correctly, responsively, and match the established design language
   (Section 9 of `CLAUDE.md`) — mobile-first, accessible link text,
   visible focus states.
6. `tsc --noEmit`, `eslint`, `next build` all clean.
7. `git status --short` touches only the one new component file and
   the one-line addition to `DecisionReport.tsx`.
8. Nothing committed until explicitly requested.

---

## Deterministic Reasoning

Trivially satisfied — this milestone is pure presentation over
already-validated, already-deterministic data. No reasoning, judgment,
or LLM involvement of any kind is introduced or would be appropriate
here; the entire task is "render what's already known, honestly."

---

*End of design specification. Awaiting review before any implementation
begins.*
