# Official Execution Roadmap — Atlas AI Version 2

**From Vision to Code: How Version 2 Actually Gets Built**

*This document translates `ATLAS_AI_V2_FINAL.md` (the approved North
Star) into a traceable execution plan, phase by phase and Milestone by
Milestone. No new strategic decision is made here — every decision in
this document is purely executional, derived directly from a decision
that already exists in the approved document.*

*Revision note: this version incorporates the approved findings of the
Executive Roadmap Review (verdict: APPROVED WITH MINOR CHANGES). The
changes are execution-efficiency refinements only — phase order,
version boundaries, the trust model, and the "Real Evidence → Real
Judgment → Real Trust → Billing" sequencing are unchanged. A full
change summary follows the document.*

**Status: Execution planning only. No code, no React components, no
Milestones have actually been created. This document plans future
Milestones; it does not create them.**

---

## 1. Executive Summary

`ATLAS_AI_V2_FINAL.md` settled the question of "what to build and why."
This document settles the next, harder, operational question: **in
what order, at what Milestone size, and under what quality gates, does
that strategic decision turn into code running in production?**

The central message of this roadmap: **Version 2 is not built as one
giant project.** It is built as five small phases, each with a single
mission, each shippable and verifiable on its own, each adding real
value to a founder before the next one begins. This is the same
discipline that already proved itself across 31 prior Milestones in
this repository — it is not reinvented here, only applied to the
hardest problem this product has faced so far: generating real
judgment without fabrication.

**The single priority governing every decision in this document**: the
value felt by a real founder, not engineering convenience. Work that
does not move Atlas AI one step closer to being "the world's best
AI Venture Partner" does not belong in this roadmap, regardless of how
easy it is to implement.

---

## 2. Relationship Between Vision and Roadmap

```
Vision (why)                ← ATLAS_AI_V2_FINAL.md
   ↓
Strategy (what)              ← Version 2 definition, Sections 15–20 of the approved document
   ↓
Versions (in what order)     ← v1 (complete) → v2.0 → v2.1 → v3 → v4 → Network track
   ↓
Phases (in what sequence within v2) ← Section 5 of this document
   ↓
Milestones (at what size)    ← Section 7 of this document
   ↓
Engineering (how, concretely) ← files, functions, tests — written later, at the time each Milestone is implemented
```

Every future Milestone must explicitly reference, in its own design
document, which phase of this document it belongs to, and which
section of `ATLAS_AI_V2_FINAL.md` it implements. A Milestone without
this explicit link does not belong in this roadmap.

---

## 3. Atlas AI Version Structure

| Version | Status | Single Mission |
|---|---|---|
| **v1 — The Foundation Era** | ✅ Complete (Milestones 1–31) | Build the engine: research, authentication, persistence, testing |
| **v2.0 — Prove the Judgment** | 🎯 Subject of this document | Prove that Atlas AI can render a real, evidence-based judgment, with zero fabrication |
| **v2.1 — Commercial Launch** | 🎯 Subject of this document | Turn proven judgment into a product people pay for |
| **v3 — The Builder Era** | Planned, not detailed here | Turn judgment into weekly, actionable execution guidance |
| **v4 — The Operator Era** | Long-term planned | Growth and fundraising, on top of a real execution record |
| **Network Track (Enterprise)** | Contingent on validation, not scheduled | Begins only after real validation conversations with real accelerators |

This document details **only v2.0 and v2.1** at the Milestone level —
the user explicitly requested "designing Version 2's execution," and
any premature detailing of v3/v4 before v2 is proven is exactly the
kind of "thinking too big too soon" that `ATLAS_AI_V2_FINAL.md` itself
rejected (Section 21, "feature creep re-emerging").

---

## 4. Version 2 Overview

**The one-sentence mandate**: make Decision Intelligence actually
decide something, on real evidence, then charge money for it — in
strict order, not simultaneously.

Per `ATLAS_AI_V2_FINAL.md` (Section 16), Version 2 is split into:

- **v2.0**: real credentials → evidence-constrained generation → a
  real final verdict → a private launch to test the zero-tolerance
  fabrication standard. **No billing here yet.**
- **v2.1**: re-validation + idea comparison + real billing → public
  launch.

Any work outside these two scopes (execution planning, fundraising
tools, accelerator/investor interfaces, any autonomous action) is
**explicitly out of scope for this document** — it belongs to
v3/v4/the Network track, and is not planned here.

---

## 5. Version 2 Execution Phases

Five phases, organized around **user value**, not technology:

```
Phase 1: Evidence Intelligence
   ↓  (prerequisite — nothing after this is honest without it)
Phase 2: Decision Intelligence
   [ Checkpoint A: Verification Layer — GO/NO-GO ]
   [ Checkpoint B: Judgment Generation ]
   ↓  (hardest phase, genuine R&D)
Phase 3: Trust & Verdict Intelligence
   ↓  (the proof gate before any billing)
Phase 4: Founder Workflow Intelligence
   (engineering for the re-validation reminder runs in parallel with Phase 2 —
    see Section 6; its release to users still follows Phase 3, unchanged)
   ↓
Phase 5: Commercial Launch
   (initial validation via Payment Links, then full metering — see Section 6)
   (the first moment Atlas AI has the right to charge money)
```

Each phase is a **gate** in front of the next — Phase 3 does not begin
before Phase 2 clears its release gates (Section 16), and Phase 5 does
not begin before Phase 3 proves the zero-tolerance standard actually
held with real founders. Phase 2 additionally carries two internal
execution checkpoints (detailed in Section 6) that do not change its
boundaries, only how its own work is sequenced and reviewed internally.

---

## 6. Detailed Phase Plans

### Phase 1 — Evidence Intelligence

- **Purpose**: turn seven fully-coded research providers from
  "disabled" into "feeding real evidence through the already-built
  ranking and aggregation layer."
- **Business value**: the cheapest, fastest improvement available in
  this entire document — days, not engineering-months. A prerequisite
  for every future "evidence-based" claim to be true in practice, not
  just in schema.
- **User value**: `DecisionProfile` stops being an honestly-empty
  record and starts containing real, inspectable evidence — even
  before any new judgment is generated on top of it.
- **Success criteria**: at least three providers (Tavily, Brave,
  Crunchbase) return real results, successfully ranked and aggregated,
  for a real test idea, with no silent failures.
- **Dependencies**: none — this phase depends only on infrastructure
  that has existed since Milestone 19.
- **Expected duration**: 2–3 weeks.
- **Complexity**: low (integration and activation, not R&D).
- **Risk**: low technically; the only real risk is operational
  (API cost/rate limits from the providers themselves).
- **Deliverables**: real credentials configured securely (environment
  variables, not code), basic health monitoring per provider, clear
  error logging when a provider fails instead of silent failure.
- **Acceptance criteria**: one full, real, end-to-end analysis shows
  real evidence (not mock data) in the resulting `DecisionProfile`.
- **Exit criteria**: Phase 2 does not begin before three consecutive
  test analyses show consistent real evidence with no silent failure.

### Phase 2 — Decision Intelligence

- **Purpose**: build the one genuinely new capability this system has
  never had — real, evidence-constrained judgment generation, behind
  the four functions that are semantically empty today.
- **Business value**: this is the phase that ends "a 9/10 backend
  wearing a 4/10 product" (`ATLAS_AI_V2_FINAL.md`, Section 7) — the
  single highest-leverage piece of work in this entire roadmap.
- **User value**: a founder gets, for the first time, real findings,
  risks, and a real thesis — not beautifully-built empty containers.
- **Success criteria**: every generated claim is successfully matched
  to a real evidence id; zero unmatched claims ever reach the user.
- **Dependencies**: depends entirely on Phase 1 clearing its exit
  criteria.
- **Expected duration**: 6–10 weeks — **the longest and least
  predictable phase in this entire roadmap**, because it is genuine
  R&D, not integration.
- **Complexity**: very high. This is the real bottleneck for the
  entire product.
- **Risk**: the highest in all of Version 2. The verification
  mechanism must be built **and tested in isolation from any actual
  generation** first, before it is wired to any real function —
  building the safety mechanism before building the capability, not
  the other way around.

**Execution checkpoints within this phase** (added per the Executive
Roadmap Review — an internal sequencing refinement, not a change to
the phase's boundaries, purpose, or exit criteria):

- **Checkpoint A — Verification Layer (Milestone 33): GO/NO-GO.**
  Once the traceability-verification mechanism is built and tested in
  isolation (no generation wired to it yet), it is formally reviewed
  as a standalone decision point before any of the four generation
  Milestones begin. "GO" means the verification layer correctly
  matches valid claims and correctly rejects untraceable ones across
  its own test suite. "NO-GO" means Checkpoint A's work continues
  until it does — no generation work starts on an unproven safety
  mechanism, regardless of schedule pressure.
- **Checkpoint B — Judgment Generation (Milestones 34–37).** The four
  generation Milestones proceed only after Checkpoint A is GO. Phase
  2's existing exit criteria (zero confirmed fabrication across an
  internal sample of at least 50 varied analyses) is Checkpoint B's
  own gate before Phase 3 begins.

This gives leadership an explicit mid-phase decision point in what is
otherwise the roadmap's longest, least predictable stretch of work,
without splitting Phase 2 into two formal phases or altering its
overall purpose, duration estimate, or exit criteria.

- **Deliverables**: a reusable traceability-verification layer
  (Checkpoint A), and real implementations behind four explicitly
  named functions (Checkpoint B).
- **Acceptance criteria**: each of the four functions is tested
  independently (unit + integration tests), with cases proving that an
  untraceable claim is actually dropped, not shown with a caveat.
- **Exit criteria**: zero confirmed fabrication cases across an
  internal test sample of at least 50 varied analyses before moving to
  Phase 3.

### Phase 3 — Trust & Verdict Intelligence

- **Purpose**: assemble the real findings from Phase 2 into a single,
  understandable final verdict, then test the "zero tolerance"
  standard with real founders before any public launch.
- **Business value**: this is the actual gate between "a product that
  might work" and "a product that has earned the right to launch
  commercially." As of this revision, it is also where commercial
  *appetite* — not just judgment quality — is first tested (see the
  private cohort Milestone in Section 7).
- **User value**: a real founder reads, for the first time, an actual
  recommendation ("worth pursuing, conditional on X") instead of a list
  of facts with no conclusion.
- **Success criteria**: a group of real founders (not an internal test)
  confirms the judgment is genuinely useful, and zero confirmed
  fabrication case reaches any of them.
- **Dependencies**: depends entirely on Phase 2 clearing its Checkpoint
  B exit criteria.
- **Expected duration**: 3–5 weeks (includes real waiting time for user
  feedback, not just engineering time).
- **Complexity**: medium engineering, high product-management effort
  (recruiting real users, gathering honest feedback).
- **Risk**: high — this is the phase that either proves or disproves
  the central claim of the entire strategy document.
- **Deliverables**: a real assembled verdict in the Decision Summary
  and Investment Memo; a small, real private cohort of founders
  actively using it; a monitoring log for any fabrication incident
  (treated as a security incident, not an ordinary bug); a
  willingness-to-pay signal gathered directly from that same cohort
  (see Section 7).
- **Acceptance criteria**: not a single confirmed fabrication incident
  during the entire private testing period.
- **Exit criteria**: Phase 5 (billing) does not begin before clearing
  this gate — the single non-negotiable condition in this entire
  roadmap.

### Phase 4 — Founder Workflow Intelligence

- **Purpose**: turn Atlas AI from a tool "visited once" into a tool
  with a real, recurring reason to return weekly.
- **Business value**: the only mechanism that prevents Version 2 from
  becoming "a one-time purchase disguised as a subscription"
  (`ATLAS_AI_V2_FINAL.md`, Section 19).
- **User value**: an honest "your analysis is 45 days old, here's what
  changed" nudge, made available as soon as the roadmap allows.
- **Success criteria**: the private cohort's founders (Phase 3)
  actually engage with the re-validation nudge rather than ignoring
  it.
- **Dependencies**: the re-validation nudge's *engineering* depends
  only on Phase 1's already-existing `refresh/` policies — it has no
  technical dependency on Phase 2's judgment-generation work, and per
  the Executive Roadmap Review may be **built in parallel with Phase
  2** rather than waiting for it. Its **release to users** remains
  sequenced after Phase 3's exit gate, unchanged — surfacing a
  staleness reminder on a judgment not yet proven trustworthy would
  give a founder little real value, so the product-facing timing is
  preserved exactly as originally planned.
- **Expected duration**: 2–3 weeks of engineering, largely absorbed
  into Phase 2's calendar window rather than adding sequential time
  after Phase 3. The idea-comparison feature is no longer part of this
  phase's Version 2 critical path (see Section 7) — it ships as a
  post-launch enhancement.
- **Complexity**: low to medium — UI on top of logic that already
  exists.
- **Risk**: low.
- **Deliverables**: a "stale analysis" badge/nudge on the project UI,
  engineered during Phase 2's window and released to users once Phase
  3 clears its exit gate.
- **Acceptance criteria**: a founder sees an honest staleness signal
  with no fabricated data, at the point the roadmap makes it visible.
- **Exit criteria**: no hard requirement to begin Phase 5 — the
  remaining work in this phase is now minimal, since its main
  deliverable is built in parallel with Phase 2 and its secondary
  deliverable has moved out of the critical path entirely.

### Phase 5 — Commercial Launch

- **Purpose**: turn proven judgment (Phase 3) and a recurring
  experience (Phase 4) into a product with a real price and a real
  paying customer.
- **Business value**: the first moment in this product's history that
  generates revenue — validated as cheaply as possible before any
  heavier billing infrastructure is built.
- **User value**: complete clarity on what's free and what's paid, with
  no surprise and no tier sold with content that doesn't exist yet.
- **Success criteria**: the first real paid subscription, collected
  successfully, with no metering or billing error.
- **Dependencies**: depends entirely on Phase 3 clearing its exit
  criteria — **no exception**.
- **Expected duration**: 3–4 weeks across Steps 1–2, plus Step 3
  (production polish) added afterward once Step 2's real subscription
  system existed to polish — the same overall order of magnitude as
  originally planned, resequenced internally for lower risk and
  earlier commercial signal.
- **Complexity**: medium overall; the first step is deliberately low
  complexity, with the heavier integration work moved later.
- **Risk**: medium — billing errors damage the trust of real paying
  customers, unlike errors in a free product. Validating real payment
  demand with a lightweight mechanism first reduces the risk of
  building full metering infrastructure before demand is confirmed.
- **Deliverables — Step 1 (initial commercial validation)**: a real
  `/pricing` page, and payment collection via Stripe Payment Links (or
  manual invoicing) for the first 10–20 paying customers, with tier
  access granted manually or through the lightest mechanism available.
  **The "Builder" tier is explicitly not offered here** — its content
  doesn't exist yet, per `ATLAS_AI_V2_FINAL.md` Section 19.
- **Deliverables — Step 2 (full commercial infrastructure)**: the
  complete `lib/services/stripe.ts` service with automated webhooks
  and metering — the long-term architecture, built once Step 1 has
  confirmed real payment demand at small scale.
- **Deliverables — Step 3 (production polish, Milestone 45)**: no new
  billing/AI capability — presentation and reliability work on top of
  Step 2's real subscription system: analysis-progress UX, a Billing
  page, a Usage page, Founder-aware account state, dashboard polish,
  and honest, specific error/loading states throughout.
- **Acceptance criteria**: Step 1 — at least one real customer
  successfully pays and is granted access with no manual error. Step 2
  — a full subscription cycle (sign up → pay → unlock features →
  cancel) works with no error in a real Stripe test environment. Step
  3 — the product's presentation layer matches the reliability of its
  underlying billing/analysis systems, with no functional change to
  either.
- **Exit criteria**: a Release Readiness Review (Section 16,
  Milestone 46) is passed before any public, self-serve announcement —
  which now follows Step 3, once both automated metering and the
  production-polish pass are complete.

---

## 7. Proposed Future Milestones

Numbered continuing from Milestone 31 (the last completed Milestone).
Each is intentionally small — no Milestone spans more than roughly two
weeks, except where explicitly noted. Numbering in this revision
reflects the merges and reordering approved by the Executive Roadmap
Review; see the change summary at the end of this document for the
old-to-new mapping.

### Phase 1

**Milestone 32 — Activate Real Research Providers (Tavily, Brave, Crunchbase)**
- Mission: real credentials for all three initial research providers
  — two general-purpose search providers and one company/funding data
  provider — verified via real analyses, with provider health
  monitoring included as part of the same, single unit of work.
- Scope: environment configuration and operational verification for
  all three providers; no logic change to `braveProvider.ts`,
  `tavilyProvider.ts`, or `crunchbaseProvider.ts` themselves if they
  work as designed. Clear error logging for any failed provider call,
  and a test simulating a single provider failure confirming the
  others continue working, are both part of this Milestone's own
  acceptance criteria rather than a separate follow-on Milestone —
  this consolidation (approved by the Executive Roadmap Review) removes
  two full release-gate cycles of process overhead for work that is
  operationally a single activity, with no deliverable lost.
- Expected files: environment variables for all three providers, any
  minor error-handling adjustment if real testing reveals a gap that
  mocked testing did not, error-logging additions.
- Deliverables: a documented test analysis with real evidence from all
  three providers; an inspectable error log; confirmation that a
  single provider's failure does not silently fail the whole analysis.
- Risks: rate limits or an unexpected response format from a real
  provider.
- Dependencies: none.
- **Explicitly outside scope**: any change to the ranking engine or
  aggregation layer — this Milestone is activation and health
  verification only, not a re-engineering effort. Any of the other
  four providers (GitHub, News, Reddit, Google) — activated later only
  if these three prove their value, not part of this current roadmap.

### Phase 2 — Checkpoint A

**Milestone 33 — Traceability Verification Layer (GO/NO-GO Checkpoint)**
- Mission: build the mechanism itself that prevents fabrication — a
  standalone function that takes a generated claim and an evidence
  array, and returns either "matched" or "rejected," **with no
  connection to any actual generation function yet.** Completion of
  this Milestone is Phase 2's Checkpoint A: a formal GO/NO-GO review
  before any generation Milestone (34–37) begins.
- Scope: pure verification logic, fully tested in isolation.
- Expected files: one new file under `lib/decision/` (exact name to be
  determined at design time), plus a companion test file.
- Deliverables: a tested verification function with multiple cases
  (successful match, failed match, missing evidence, invalid id).
- Risks: a weak design here invalidates the entire "no fabrication"
  guarantee downstream — the highest-risk engineering Milestone in all
  of Version 2.
- Dependencies: Phase 1 complete (needs real, final-shape evidence data
  to test against realistically).
- **Explicitly outside scope**: any actual LLM call — this Milestone
  builds the lock before building the door.

### Phase 2 — Checkpoint B

**Milestone 34 — Real Generation for `deriveFindings()`**
- Mission: connect the first of the four functions to real generation,
  constrained by the verification layer (Milestone 33).
- Scope: one function only — deliberately, not all four at once.
- Deliverables: real findings appearing in `DecisionProfile`, each
  linked to real, traceable evidence.
- Risks: result quality may be shallow in the first iteration —
  acceptable as long as fabrication is zero; qualitative improvement is
  a later track.
- Dependencies: Milestone 33 (Checkpoint A: GO).
- **Outside scope**: `deriveCriticalRisks()` and the remaining three
  functions.

**Milestone 35 — Real Generation for `deriveCriticalRisks()`**
- Same shape as Milestone 34, specifically for critical risks.
- **Outside scope**: any cross-project risk-prioritization logic —
  single-project risks only here.

**Milestone 36 — Real Generation for `buildInvestmentThesis()`**
- Same shape, for the investment thesis.
- **Outside scope**: any special formatting of the investment memo
  itself — this Milestone generates content, it does not redesign the
  presentation.

**Milestone 37 — Real Generation for `buildRecommendation()`'s Calling Logic**
- Mission: the last of the four functions — assembling a
  recommendation from the previous three (findings/risks/thesis).
- **Outside scope**: any new numeric score or additional confidence
  metric — uses what already exists in `DecisionProfile`.

**Why Milestones 34–37 remain separate (reviewed per the Executive
Roadmap Review's explicit condition, and not merged):** the Executive
Roadmap Review asked that these four be merged only if doing so keeps
each resulting Milestone small, independently testable, and completable
in roughly one to two weeks — and kept separate otherwise, with
justification. Each of these four functions requires its own
generation logic, its own prompt behavior tuned to a different kind of
claim (a finding is not shaped like a risk, a thesis is not shaped like
a recommendation), and its own isolated test suite proving zero
fabrication for that specific function. Phase 2 as a whole is already
estimated at 6–10 weeks across five Milestones — pairing any two of
these four would likely push a single Milestone past the one-to-two
week bound, and would also make it harder to isolate which of two
merged generation efforts caused a given test failure, directly
working against this phase's own highest-risk concern (Section 6).
They are kept separate for this reason, not merged for the sake of a
smaller Milestone count.

### Phase 3

**Milestone 38 — Assemble the Final Verdict**
- Mission: a single, assembled recommendation that actually appears in
  the Decision Summary and Investment Memo, built on the combined
  outputs of Milestones 34–37.
- Deliverables: real, readable, understandable, non-fabricated verdict
  text, appearing in the existing UI with no design change.
- **Outside scope**: any design change to `DecisionArtifactLinks` or
  page routes — this Milestone is content only.

**Milestone 39 — Private Cohort Launch**
- Mission: recruit a small group of real founders (personal network,
  not a public announcement), run manual monitoring for any
  fabrication incident, **and validate commercial appetite directly
  with the same cohort.**
- Scope: primarily product/process, not large new engineering — may
  require a simple reporting mechanism ("flag an incorrect result").
  In addition to fabrication monitoring, this Milestone includes a
  **willingness-to-pay validation activity**: asking each private
  cohort founder a direct, structured question (e.g., "would you pay
  $X/month for this, and why or why not") before any Phase 5
  engineering begins. This is a product-validation activity, not
  engineering work, and requires no new tooling beyond a conversation
  or a short survey — it exists to test commercial appetite as
  directly and cheaply as fabrication-quality is already being tested
  in this same Milestone.
- Deliverables: 5–10 actively engaged founders, a review log for every
  analysis they produce, and a documented willingness-to-pay signal
  (what they said they'd pay, and why) informing Phase 5's approach.
- Risks: a very small user count may not surface every failure pattern
  — accepted as a reasonable bound for a first pass, not a full
  guarantee.
- Dependencies: Milestone 38.
- **Outside scope**: any public announcement or marketing page; any
  Stripe or billing engineering — the willingness-to-pay activity is
  a conversation, not a payment flow.

**Milestone 40 — Address Private Cohort Findings**
- Mission: scoped only after Milestone 39's results appear — its scope
  is deliberately reactive, not pre-planned in detail. If a fabrication
  incident surfaces, this Milestone fixes it before anything else
  proceeds.
- **Outside scope**: no work on Phase 4 (release) or Phase 5 begins
  before this Milestone closes successfully. (Phase 4's re-validation
  engineering may already be underway in parallel with Phase 2, per
  Section 6 — that parallel engineering work is unaffected by this
  Milestone; only its *release* to users waits here.)

### Phase 4 (engineering runs in parallel with Phase 2 — see Section 6)

**Milestone 41 — Re-validation Interface**
- Mission: surface a "stale" state using the already-existing
  `refresh/` policies.
- Scope note: this Milestone's engineering has no technical dependency
  on Phase 2 or Phase 3 and may be executed in parallel with Phase 2's
  calendar window. Its release to users still waits for Phase 3's
  exit gate, unchanged from the original plan.
- Deliverables: a clear badge/nudge on the project page when an
  analysis exceeds the staleness threshold already defined at the
  platform level.
- **Outside scope**: any new staleness logic or a proactive AI trigger
  — that is an explicitly noted v3/v4 refinement, not here.

**Milestone 42 — Idea Comparison (Post-Launch Priority)**
- Mission: a lightweight view comparing two or more analyses for the
  same founder.
- **Priority change (per the Executive Roadmap Review)**: this
  Milestone is no longer on the Version 2 critical path. It is not
  removed — it remains a real, planned deliverable — but is
  reprioritized as a **post-launch enhancement**, shipped shortly after
  Phase 5's public launch rather than gating any part of it. A first
  paying customer typically has only one analysis; comparison value
  only appears once a founder has two or more, which makes it a
  natural post-launch addition rather than a pre-launch requirement.
- Deliverables: a single display component consuming existing data,
  with no new complex computation.
- **Outside scope**: any advanced "pattern analysis" across many
  projects — this Milestone is deliberately simple and direct; deeper
  analysis is explicitly deferred to the 2030 vision in the approved
  document.

### Phase 5

**Milestone 43 — Initial Commercial Validation (Payment Links)**
- Mission: collect real payment from the first 10–20 paying customers
  using Stripe Payment Links (or manual invoicing), and a real
  `/pricing` page — without building the full metered service yet.
- Scope: the lightest possible mechanism that proves real payment
  demand: a hosted Payment Link (or manual invoice), and manual or
  minimal-tooling account access granted on confirmed payment.
- Deliverables: a live `/pricing` page describing the Free and
  Founder tiers; a working Payment Link (or invoicing process); a
  documented record of the first paying customers and how access was
  granted.
- Risks: manual processes do not scale past a small cohort — accepted
  deliberately, since this Milestone's purpose is validating demand,
  not serving a public audience.
- Dependencies: Milestone 40 (Phase 3 fully closed).
- **Explicitly outside scope**: any custom Stripe service code,
  webhook handling, or automated metering — that is Milestone 44. The
  "Builder" tier — its content doesn't exist yet.

**Milestone 44 — Full Stripe Integration & Automated Metering**
- Mission: once Milestone 43 confirms real payment demand at small
  scale, build the complete, long-term billing architecture: one new
  service (`lib/services/stripe.ts`), following the same shape as
  every other service in this repository, with automated webhook
  handling and metering replacing the manual process used in
  Milestone 43.
- Deliverables: subscription creation, webhook receipt, automated
  account status update; enforced free-tier limits.
- Risks: mishandling a webhook corrupts a real customer's billing state
  — requires careful testing before this replaces the manual process.
- Dependencies: Milestone 43 (real demand confirmed).
- **Outside scope**: any complex multi-currency pricing logic or
  discounts — a simple two-tier pricing model only; the "Builder" tier.

**Milestone 45 — Production Polish & Reliability**
- Mission: with authentication, Stripe subscriptions, Founder-tier
  gating, webhooks, and the AI analysis pipeline all real and working
  (Milestone 44), make the product *feel* like a polished commercial
  SaaS rather than a working prototype — before the release-readiness
  gate that follows it. Not a new-feature milestone: no new AI
  capability is added here.
- Scope: analysis-creation UX (a real progress experience instead of
  an apparent timeout during the pipeline's normal 20-40s run), a
  Billing page (plan/status/renewal/Stripe Customer Portal link) and a
  Usage page (this month's counts, Free-tier remaining vs. Founder
  unlimited) under Settings, a Founder-aware pricing/account state (no
  more "Get Founder" once already subscribed), dashboard polish (recent
  activity, quick actions, usage/subscription summaries), toast
  notifications on analysis completion/failure, and specific, honest
  error states (network issue, still processing, session expired, rate
  limited, subscription required) replacing generic error boundaries.
- **Outside scope**: rewriting the architecture; any change to the
  Stripe integration's actual billing/webhook logic, authentication, or
  the Supabase schema (Milestone 44's own data model and flows stay
  exactly as they are — this milestone is presentation and reliability
  on top of them, not underneath them); any new AI/analysis capability.
- Dependencies: Milestone 44 (Full Stripe Integration & Automated
  Metering).

**Milestone 46 — Release Readiness Review and Public Launch**
- Mission: the final release gate (Section 16) before publicly
  announcing self-serve access to the paid "Founder" tier, now that
  automated metering (Milestone 44) and the production-polish pass
  (Milestone 45) are both complete.
- **Outside scope**: any new engineering work — this Milestone is
  review and verification only.

---

## 8. Engineering Priorities — Ordered by Leverage

**Not by ease of implementation — by the amount of value added per unit
of effort, for the founder:**

1. Real evidence activation (Phase 1) — absolute highest leverage: days
   of operational work unlock everything else.
2. The traceability verification layer / Checkpoint A (Milestone 33) —
   critical security leverage: without it, all subsequent Phase 2 work
   is unsafe to ship.
3. Real generation for the four functions / Checkpoint B (Milestones
   34–37) — the highest leverage on direct product value.
4. Assembling the final verdict (Milestone 38) — turns invisible
   internal work into value the user directly feels.
5. Re-validation engineering (Milestone 41) — deliberately pulled
   forward to run in parallel with Phase 2, so a low-risk, low-effort
   deliverable is not left idle during the roadmap's longest and least
   predictable stretch.
6. A cheap willingness-to-pay signal (folded into Milestone 39) — near
   zero cost, resolves commercial-appetite risk before any Phase 5
   engineering begins.
7. Initial commercial validation via Payment Links (Milestone 43) —
   validates real payment demand before investing in full metering
   infrastructure.
8. Full Stripe integration and automated metering (Milestone 44) —
   commercial leverage, built only once demand is confirmed.
9. Idea comparison (Milestone 42) — real retention value, but
   deliberately reprioritized after public launch rather than gating
   it.
10. **Lowest leverage right now, deliberately deferred**: storage
    consolidation, paying down `dedupeByKey` debt, and extending test
    coverage to the other five knowledge platforms — all real and
    important, but **not executed until after Phase 5 ships in full**,
    exactly as `ATLAS_AI_V2_FINAL.md` settled (Section 20).

---

## 9. Product Priorities

- **Top priority**: that the founder feels the judgment they're reading
  is real and honest — not that the interface is beautiful. Any new UI
  work in this version (Milestones 38, 41, 42) is built on top of
  existing components, not a redesign of them.
- **No formal onboarding before Phase 5** — the users during Phases 1–4
  are the development team itself, then a small private cohort
  (Milestone 39), not a general public audience needing a polished
  sign-up experience.
- **Research/templates/reports stub pages remain as-is** — not
  developed during Version 2; not part of the "real judgment and
  billing" mission.

---

## 10. AI Priorities — Separate Layers, No Mixing

| Layer | Status Today | When It's Built in This Roadmap |
|---|---|---|
| **Rule-based Intelligence** | Already exists (confidence computation, `refresh/` policies) | No change — used as-is |
| **Decision Intelligence** | Semantically empty today | **Phase 2 (Milestones 33–37) — the centerpiece of this entire roadmap** |
| **LLM Reasoning** | Does not exist | Built **inside** Phase 2, constrained exclusively by the verification layer (Milestone 33, Checkpoint A) — the LLM is never called outside this constraint |
| **Execution Intelligence** | Does not exist | **Entirely outside the scope of this roadmap** — belongs to v3, not planned here |
| **Autonomous Intelligence** | Does not exist, and is rejected | **Never built under any current plan** — explicitly and permanently rejected in `ATLAS_AI_V2_FINAL.md` |

**The strict rule governing this ordering**: not a single LLM call is
made in this version outside the traceability verification layer. LLM
reasoning is not a standalone layer that can be freely built — it is a
*constrained part* of the Decision Intelligence layer, not a layer
parallel to it.

---

## 11. Business Priorities

Direct answers to the specific operational questions:

- **When does billing begin?** Only after Phase 3's exit criteria are
  cleared (Milestone 40) — zero confirmed fabrication incident across
  a real private cohort. No exception. It begins, even then, at the
  lightest possible mechanism (Milestone 43 — Payment Links), not full
  metering.
- **When does onboarding exist?** A simple version appears with
  Milestone 46 (public launch) — not a priority before that.
- **When are beta users invited?** Milestone 39, small and deliberately
  private — not a public announcement. The same cohort is also used to
  gather a direct willingness-to-pay signal, ahead of any billing
  engineering.
- **When do YC applications become realistic?** **Not part of this
  roadmap at all.** Realistic only after real usage and retention data
  exists for several months following public launch (Phase 5) — a
  re-evaluation made after v2.1 ships in full, not before.
- **When does fundraising begin?** **Not within this roadmap.** Raising
  funds before proving judgment quality and real retention data means
  raising on the story of a 9/10 backend still charging zero dollars —
  precisely the description `ATLAS_AI_V2_FINAL.md` rejects (Section 7).
- **When do Enterprise features begin?** **Never within this roadmap.**
  Contingent on real validation conversations with real accelerators (a
  track entirely separate from v2), and no engineering begins before
  that validation — a decision settled in the approved document and not
  reopened here.

---

## 12. Technical Priorities

**Paid down now** (before any part of Phase 5 ships):
- Nothing additional required here specifically — Phases 1 and 2 *are*
  the most important debt actually worth paying (activating evidence,
  building verification).

**Deliberately waits until after Version 2 ships in full**:
- Storage consolidation (Memory + Supabase only, retiring raw Postgres
  and the speculative Warehouse variant).
- Paying down the `dedupeByKey`/`urlNormalization` debt (five copies).
- Extending the Milestone 30 test pattern to the other five knowledge
  platforms.

**Architecture investments**: nothing new required — the existing six
platforms suffice (settled in `ATLAS_AI_V2_FINAL.md`, Section 20, not
reopened here).

**Infrastructure investments**: search-provider health monitoring only
(now folded into Milestone 32's own acceptance criteria) — no larger
infrastructure required for this version's user scale.

**Security investments**: secure handling of provider credentials
(environment variables only, never logged); strict signature
verification for Stripe webhooks (Milestone 44) — any error here
exposes real payment data to risk.

**Performance investments**: nothing proactive — Version 2 serves a
small number of real users (a private cohort, then an early public
launch); optimizing before measuring is explicitly rejected by this
project's own principles.

**Testing investments**: every Milestone from 33 through 44 ships with
its own tests (the existing Milestone 30 pattern) — no Milestone is
considered complete without tests specifically covering it, even while
extending coverage to the other platforms is deferred.

**CI/CD improvements**: no change to the existing GitHub Actions
pipeline — it remains a mandatory gate for every Milestone as-is,
without expanding its scope in this version.

**Observability improvements**: clear error logging for search-provider
failures (Milestone 32), and a review log for any fabricated claim
rejected by the verification layer (Milestone 33) — the minimum
necessary for this version specifically, not a new comprehensive
monitoring system.

---

## 13. Dependencies

```
Phase 1 (Evidence)
   → Phase 2 (Decision)
      Checkpoint A: Milestone 33 (Verification) — GO/NO-GO
         → Checkpoint B: Milestones 34–37 (Generation), only after GO
      → Milestone 38 (Verdict) depends on 34–37 completing together
         → Phase 3 (Trust) — does not begin without a real assembled verdict
            → Milestone 39 (Private Cohort): fabrication monitoring AND
              willingness-to-pay validation, together
            → Milestone 40 (Findings addressed)
               → Phase 5 (Billing) — forbidden before clearing this gate
                  → Milestone 43 (Payment Links) → Milestone 44 (Full
                    Stripe) → Milestone 45 (Production Polish) →
                    Milestone 46 (Public Launch)

Phase 4 (Milestone 41 — Re-validation engineering):
   → depends only on Phase 1; runs in parallel with Phase 2's calendar
     window; its user-facing release still waits for Phase 3 to close
     (Milestone 40), unchanged from the original plan.

Phase 4 (Milestone 42 — Idea Comparison):
   → moved out of the Version 2 critical path entirely; scheduled
     after Milestone 46 (public launch) as a post-launch enhancement.
```

**The single unbreakable critical dependency in this entire document**:
Phase 5 never begins before clearing Phase 3's exit gate.

---

## 14. Risks

- **Phase 2 running longer than expected.** Real R&D cannot be
  precisely estimated up front — this is accepted and expected; the
  schedule is never compressed at the expense of the verification
  layer's quality. Checkpoint A now gives leadership an explicit,
  earlier decision point if this risk materializes, rather than
  discovering it only at Phase 2's very end.
- **A private cohort too small to surface every failure pattern**
  (Milestone 39) — mitigated by careful manual review of every analysis
  during this period, not by relying on scale alone.
- **Pressure to start billing early to generate revenue faster.**
  Explicitly rejected — any attempt to bypass Phase 3's exit gate
  contradicts the central principle of this entire document and the
  approved strategy it is derived from. The willingness-to-pay signal
  gathered in Milestone 39 exists to inform Phase 5, not to justify
  starting it early.
- **Drift toward paying down technical debt before shipping value.**
  Explicitly prevented by the ordering settled in Section 8 — technical
  debt waits, value does not.
- **Real search-provider call costs exceeding expectations.** Monitored
  directly from Milestone 32 onward, before any commitment to larger
  usage volume.
- **Manual payment processes (Milestone 43) not scaling past a small
  cohort.** Accepted deliberately — this step exists to validate
  demand cheaply, not to serve a public audience; Milestone 44 replaces
  it before any public launch.

---

## 15. Success Metrics

Taken directly from `ATLAS_AI_V2_FINAL.md` (Section 23), applied here
specifically at the Version 2 execution level:

- **Judgment quality**: the percentage of findings that the private
  cohort (Milestone 39) rates as genuinely useful.
- **Zero tolerance**: any confirmed fabrication incident reaching a
  user — a hard gate, not an improvement target.
- **Willingness-to-pay signal**: what the private cohort says it would
  actually pay, gathered before any billing engineering begins.
- **First successful paid subscription**: the first real test that
  payment collection works at all (Milestone 43), followed by the
  first test that the full automated billing cycle works
  (Milestone 44).
- **Real engagement with the re-validation nudge**: the first signal
  that the retention mechanism (Milestone 41) actually works, not just
  theoretically.

---

## 16. Release Gates

**No phase is considered complete before passing all of the following
gates, for every Milestone within it:**

1. **Architecture Review**: are new files in the right folder
   (Section 4 of `CLAUDE.md`)? Do layers respect their boundaries (a
   service is not implemented inside a route, business logic is not
   implemented inside a component)?
2. **Implementation Review**: read the full diff against the specific
   Milestone's design scope — no work outside what was explicitly
   described as "in scope" for that Milestone (Section 7).
3. **Verification**: `tsc --noEmit` with zero errors, `eslint` with no
   new errors, all tests accompanying the Milestone actually pass.
4. **Acceptance Review**: the acceptance criteria defined for each
   phase (Section 6) are tested manually, not assumed passed just
   because automated tests passed.
5. **Release Readiness Review**: with the same rigor as the Milestone
   31 review (A/B/C model: ready / ready with small changes / not
   ready) — conducted before merging the phase's work as a whole, not
   just per individual Milestone. Phase 2 additionally passes through
   Checkpoint A as a dedicated GO/NO-GO review before Checkpoint B's
   work begins (Section 6).
6. **GitHub Actions**: the existing pipeline passes in full — no
   exception, no bypass (`--no-verify`) under any circumstance.
7. **Production Readiness**: specific to Phase 5 — verified twice, not
   once: first, that Milestone 43's Payment Link (or manual invoicing)
   flow correctly grants access on confirmed payment; second, once
   Milestone 44 ships, that the full automated subscription cycle
   works with no error in a real Stripe test environment before public
   launch.

**No part of Phase 5 ships without first clearing Phase 3's exit gate
— this is not a procedural formality, it is a direct reflection of the
central truth running through the entirety of `ATLAS_AI_V2_FINAL.md`.**

---

## 17. Estimated Timeline

For a small team (one or two people assisted by AI), not a 500-person
team:

| Phase | Estimated Duration |
|---|---|
| Phase 1 — Evidence Intelligence | 2–3 weeks |
| Phase 2 — Decision Intelligence (Checkpoint A + Checkpoint B) | 6–10 weeks (least predictable) |
| Phase 3 — Trust & Verdict | 3–5 weeks (includes waiting for real feedback and the willingness-to-pay activity) |
| Phase 4 — Recurring Experience | Engineering absorbed into Phase 2's window (near-zero added critical-path time); idea comparison moved post-launch |
| Phase 5 — Commercial Launch | 3–4 weeks (Payment Links validation, then full metering) |
| **Total estimate for all of v2** | **Roughly 4–5 calendar months** |

**This is an estimate, not a strict commitment.** Phase 2 specifically
is real R&D; any pressure on its schedule at the expense of the
verification layer's (Milestone 33) quality directly contradicts the
"zero tolerance for fabrication" priority that governs this entire
document. The modest reduction from the prior 4–6 month estimate
reflects Phase 4's engineering running in parallel with Phase 2 and
the consolidation of Milestones 32/33/34 (former numbering) into a
single Milestone — not a change in ambition or scope.

---

## 18. Long-Term Evolution (Beyond Version 2)

At a high level only — no Milestone-level detail here, exactly as
Section 3 settled:

- **v3 (The Builder Era)**: real execution planning (Section 17 of
  `ATLAS_AI_V2_FINAL.md`) — detailed planning for it begins only after
  v2.1 is proven commercially, with months of real usage data.
- **v4 (The Operator Era)**: growth and fundraising, on top of a real
  execution record from v3.
- **Network Track**: its validation (not its engineering) begins in
  parallel with v2/v3, but any actual engineering build is contingent
  on documented validation conversations with real accelerators first —
  no fixed timeline exists for it in this document because, by
  definition, it is contingent on an outcome not yet realized.

**Overall 24-month horizon**: all of v2 (~4–5 months) → a real
measurement and retention period (~3–6 additional months before any
fundraising or YC decision) → detailed v3 planning begins → v3
execution (~6–9 months) → v4 planning begins and Network-track
validation proceeds in parallel.

---

## 19. What We Explicitly Will NOT Build (Within This Roadmap)

Taken directly from the rejected goals in `ATLAS_AI_V2_FINAL.md`
(Section 22), applied here concretely to this version's decisions
specifically:

- No general-purpose chat interface within any Milestone from 32 to 45.
- No form of autonomous execution whatsoever — every Milestone in Phase
  2 produces text the founder reads and decides on themselves, not an
  action executed automatically.
- No direct accelerator or investor interface — even the "consent-
  gated export" feature (Section 4 of the approved document) is not
  within the scope of any Milestone here; it waits for the separate
  Network track.
- No "Builder" pricing tier at launch (Milestones 43 or 44) — its
  content doesn't exist yet.
- No custom Stripe service code before real payment demand is
  confirmed (Milestone 43 precedes Milestone 44, not the reverse).
- No expansion of test coverage beyond what specifically concerns
  Milestones 32–45 — extending coverage to the other five platforms is
  deliberately deferred (Section 12).
- No carefully-designed onboarding before Phase 5 — unnecessary for a
  small private cohort.
- No idea-comparison feature before public launch (Milestone 42 is a
  post-launch enhancement, not a v2 critical-path item).

---

## 20. Final Recommendations

1. **Start Phase 1 immediately once execution is approved** — the
   cheapest work in this entire roadmap, and the highest leverage.
2. **Do not shortcut Milestone 33 / Checkpoint A** (the verification
   layer) to speed up reaching real generation — this single file is
   the entire difference between a product that deserves trust and a
   product that merely sounds smart. Treat its GO/NO-GO review as a
   real decision point, not a formality.
3. **Do not negotiate Phase 3's exit gate.** Any commercial or
   marketing pressure to start billing before proving zero fabrication
   must be rejected by the team itself, not just by this document.
4. **Do not expand the scope of any individual Milestone during
   execution.** If a Milestone reveals necessary additional work, a new
   small Milestone is created instead of inflating the current scope —
   the same discipline that already proved itself across 31 prior
   Milestones.
5. **No work from Section 11 (YC applications, fundraising, Enterprise
   features) begins before Phase 5 is actually complete and real usage
   data exists afterward** — these are not decisions for this roadmap
   to make today, but decisions revisited once real evidence exists.
6. **Start Milestone 41's engineering during Phase 2's window**, since
   it has no technical dependency on judgment quality — but hold its
   release to users until Phase 3 closes, exactly as planned.
7. **Use Milestone 39's willingness-to-pay conversation to inform, not
   gate, Phase 5** — it is a cheap signal, not a substitute for Phase
   3's zero-fabrication requirement.

---

*End of roadmap. No code has been written. No actual Milestone has been
created. `ATLAS_AI_V2_FINAL.md` has not been modified. This document
plans execution; it does not begin it.*
