# Atlas AI — Milestone 13 Design Specification

**Verification Layer: Making Evidence, Sourcing, and Confidence Visible**

Status: **Design only. No code, no folders, no source files exist yet.**
This document is the complete architecture and design specification for
Milestone 13, written for review before any implementation begins.
Nothing described here has been built. This revision replaces the prior
draft in full, incorporating six required review changes.

Phase 1 (the six knowledge platforms), Milestone 11 (`lib/pipeline/`),
and Milestone 12 (`lib/analysis-session/`) are frozen. This milestone is
additive and must consume only public barrels — the same discipline
every prior milestone held itself to.

**Architecture reviewed before proposing this design:** `lib/research/`
through `lib/decision/` (the six knowledge platforms, Milestones 4–10),
`lib/pipeline/` (Milestone 11), `lib/analysis-session/` (Milestone 12),
`ARCHITECTURE_REVIEW.md`, and `PRODUCT_BACKLOG.md` (the real user-testing
feedback this milestone is built to answer).

---

## 1. Purpose

### Naming decision (required review change)

The prior draft proposed `lib/trust-report/` and a `TrustReport` type as
both the module's identity and its output shape. On review, that name
does not hold up, for a reason specific to this codebase's own
conventions:

**Every module built so far is named after a capability, never after an
artifact.** `lib/pipeline` is not called `lib/execution-report`.
`lib/analysis-session` exports `buildTimeline`/`buildLogs`/
`projectSessionState` — computed views with capability names — not a
single `SessionReport` type. Milestone 10 itself draws exactly this
distinction internally: `DecisionProfile` (the durable, reusable
synthesis) is a different kind of thing from `buildInvestmentMemo`/
`buildDueDiligenceReport`/`buildExecutiveSummary` (genuinely terminal,
audience-addressed documents built *from* that profile).

This milestone is the first kind of thing, not the second. It is not a
terminal document handed to one audience once — it is a **reusable
computed view** (verified-vs-unverified classification, source
organization, confidence re-presentation) that a dashboard queries
freely, that a future feature (citation hyperlinking, a trust badge,
cross-session comparison — Section 11) builds on directly, and that a
future report builder (`buildInvestmentMemo` and siblings) could itself
call to embed an evidence section, exactly the way those builders already
call `aggregateEvidence()` and `computeDecisionConfidence()` today.
Naming the whole layer after one output shape would misdescribe it the
same way naming `lib/analysis-session` "the Timeline Report" would have.

**Decision: rename the module to `lib/verification/`, and rename its
primary output type from `TrustReport` to `VerificationSummary`.** The
function names change accordingly: `buildVerificationSummary` and
`buildVerificationSummaryFromSession`. This does not prevent a future
dashboard from labeling the rendered result "Trust Report" in its own
copy/headings — that is a presentation choice for a later milestone, not
this layer's identity. The architecture is named for what it does
(verification); the UI remains free to name what the user sees.

Every other section below uses this corrected naming throughout.

### Why this milestone exists

Milestones 11 and 12 answered `PRODUCT_BACKLOG.md`'s first Priority 1
category — **Analysis Experience** — by making the *process* of analysis
observable: a stage timeline, real progress, cancellation, per-stage
retry. Milestone 13 exists to answer the backlog's *second* Priority 1
category, verbatim from real user testing (`PRODUCT_BACKLOG.md` Section
4, **Trust & Evidence**):

> Most information feels generic. Sources are not visible. Facts are not
> clearly referenced. Confidence is difficult to trust. Conclusions are
> not sufficiently explained. It is unclear which information is
> verified versus inferred.

Every fact this complaint is about **already exists** in the codebase.
`DecisionProfile` (Milestone 10) already carries real `sources`,
`evidence`, a real `confidenceSummary` (`evidenceConfidence`,
`coverage`, `unknownPercentage`, `dataFreshnessDays`), and an honest
`decisionLimitations`/`openQuestions` ledger of exactly what *isn't*
backed by evidence. None of it is packaged into something a person can
actually read. Milestone 13 is a **packaging milestone**: it takes data
that is already real, already computed, and already honest, and
organizes it into a **VerificationSummary** that makes sourcing,
confidence provenance, and the verified/inferred distinction directly
visible.

---

## 2. Problem Being Solved

Six backlog complaints, mapped to what this milestone answers — no new
complaint is invented, and none of the six is addressed by inventing new
data:

| Backlog complaint | What Milestone 13 does about it |
|---|---|
| "Most information feels generic." | Groups the evidence already behind a result so it reads as *this specific analysis*, not boilerplate. |
| "Sources are not visible." | Surfaces `DecisionProfile.sources` directly — every source's title, URL, and domain, not buried inside nested objects. |
| "Facts are not clearly referenced." | Pairs every `Finding`/`RiskFinding` with the exact `Evidence[]` that already backs it (a `RiskFinding` is schema-*required* to carry at least one — Milestone 10's own "evidence-backed only" rule). |
| "Confidence is difficult to trust." | Surfaces `DecisionConfidence`'s own four separate dimensions, unchanged, instead of a single opaque number. |
| "Conclusions are not sufficiently explained." | Surfaces the `rationale` fields Milestone 9/10 already attach to health/readiness/risk assessments, alongside the claims they explain. |
| "Unclear which information is verified versus inferred." | Splits every claim into exactly two buckets: **verified** (has real `Evidence`) and **unverified** (`decisionLimitations`/`openQuestions` — Milestone 10's own honest gap ledger), with a real, counted ratio between them. |

**What this milestone is not:** it does not gather new evidence, does
not compute a new confidence number, and does not generate a new
Finding or RiskFinding. If a design decision below starts to look like
"derive a new fact Decision Intelligence didn't already compute," that
is a sign the boundary is wrong — this milestone organizes, it does not
originate.

---

## 3. Architectural Position

```
┌──────────────────────────────────────────────────────────────┐
│ Future Dashboard / UI                                              │
│  (not yet built — renders a Verification Summary alongside a         │
│   session's Timeline/Logs, and may label it "Trust Report" as a       │
│   copy choice — see Section 1)                                          │
├───────────────────────────────┬──────────────────────────────┤
│ Milestone 13 — Verification         │ Milestone 12 — Analysis Session      │
│ (lib/verification/, proposed)       │ (lib/analysis-session/) — frozen      │
│ Presents evidence & confidence.       │ Presents timeline, progress, logs.     │
├───────────────────────────────┴──────────────────────────────┤
│ Milestone 11 — Execution Pipeline  (lib/pipeline/)   — frozen              │
├──────────────────────────────────────────────────────────────┤
│ Decision Intelligence  (lib/decision/)  — frozen (the actual source of      │
│  every fact this milestone presents: sources, evidence, confidence,          │
│  findings, risks, limitations)                                                │
├──────────────────────────────────────────────────────────────┤
│ Business / Financial / Market / Competitor / Research  — frozen              │
└──────────────────────────────────────────────────────────────┘
```

**Verification is a sibling to Analysis Session, not a layer on top of
it.** Both sit at the same architectural height, both present a
completed `DecisionProfile` for a future dashboard, and neither depends
on the other for its *primary* function:

- `buildVerificationSummary(profile: DecisionProfile): VerificationSummary`
  — the primary API — depends **only** on `lib/decision`'s public
  barrel. It needs Milestone 10 to exist; it does not need Milestone 11
  or 12 to exist to do its job.
- `buildVerificationSummaryFromSession(session: AnalysisSession):
  VerificationSummary | null` — a **secondary, convenience** API —
  depends on `lib/analysis-session`'s public barrel (for the
  `AnalysisSession` type and its `result` field), since that is how a
  real caller will most often already be holding a `DecisionProfile` in
  practice (Section 8 explains this is the actual reason this milestone
  belongs after Milestone 12, not a hand-wave).

No platform below this line may ever import from `lib/verification/` —
the same DAG-preserving rule verified for every layer so far.

---

## 4. Responsibilities

### Owns

- **Building a Verification Summary** from an already-complete
  `DecisionProfile` — grouping its own `sources`, pairing its own
  `Finding`/`RiskFinding` evidence, and re-presenting its own
  `confidenceSummary` unchanged.
- **The verified/inferred classification rule** — and only one rule,
  applied consistently: a claim is **verified** if it carries at least
  one real `Evidence` entry, **unverified** otherwise. This is not a new
  judgment invented at this layer; it is the exact rule Milestone 10's
  own `RiskFindingSchema` already enforces structurally
  (`evidence.length >= 1`) for red flags, extended here as the single,
  consistent lens the whole summary is organized through.
- **Simple, real counts** — how many sources, how many unique domains,
  how many verified vs. unverified claims, and the ratio between them.
  Every number here is a count over data that already exists; none is a
  new estimate.

### Must never own

- **Any research, discovery, classification, estimation, or synthesis
  logic.** Same rule every milestone through Decision Intelligence held:
  no research, no competitor discovery, no market classification, no
  financial estimation, no business synthesis, no decision synthesis.
- **Any orchestration or session-lifecycle logic.** Verification never
  starts, cancels, retries, or resumes anything — it has no concept of
  "in progress," only "here is a completed profile, present it."
- **A second confidence calculation.** `VerificationSummary.confidence`
  is `DecisionProfile.confidenceSummary`, unchanged. This layer never
  recomputes evidence confidence, coverage, or freshness — Milestone
  10's `computeDecisionConfidence()` remains the only place that math
  happens.
- **Persistence of its own.** A Verification Summary is 100%
  re-derivable at any time from a `DecisionProfile` that some other
  layer already stores (Decision's own store, or indirectly via a
  Session's execution). See Section 9 for why this means no `storage/`,
  no `lifecycle/`, no state machine exists in this design at all —
  deliberately, not by omission.

---

## 5. Public APIs

```ts
// Primary — depends only on lib/decision.
buildVerificationSummary(profile: DecisionProfile): VerificationSummary

// Convenience — depends on lib/analysis-session too. Returns null when
// the session hasn't reached a DecisionProfile yet (anything short of
// `completed`), never a partially-built summary.
buildVerificationSummaryFromSession(session: AnalysisSession): VerificationSummary | null
```

Two functions, both pure. No third function is proposed. Section 1
already establishes that this is a reusable capability, not a
one-artifact layer — but "reusable" is satisfied by these two functions
being callable from anywhere, not by pre-splitting their internals into
extra exported primitives (e.g. a separate exported classifier, a
separate exported source-counter) that nothing calls today. That
decomposition can happen later, if and when a second real caller needs
just one piece — introducing it now would be exactly the "abstraction
for theoretical future use" Section 16 (Non-Goals) rules out.

**`VerificationSummary`** — the one thing both functions return:

```ts
interface VerificationSummary {
  confidence: DecisionConfidence;        // reused verbatim from lib/decision
  sources: Source[];                       // reused verbatim from lib/decision
  sourceBreakdown: {
    totalSources: number;
    uniqueDomains: number;
  };
  verifiedClaims: VerifiedClaim[];          // Findings/RiskFindings that carry real evidence
  unverifiedStatements: string[];             // decisionLimitations + openQuestions, unchanged
  verificationCounts: {
    verifiedCount: number;
    unverifiedCount: number;
    verifiedRatio: number;                     // a real count-based ratio, 0 when there's nothing to count
  };
  generatedAt: string;
}

interface VerifiedClaim {
  kind: "finding" | "critical_risk";
  category: FindingCategory;                  // reused from lib/decision
  severityLabel: string;                        // Finding's Severity or RiskFinding's RedFlagSeverity, stringified for one uniform field
  summary: string;
  evidence: Evidence[];                         // always non-empty by construction — see Section 6
  confidence: number;
}
```

`Source`/`Evidence` are never redefined here — the same
`PipelineContextSchema.shape.decision`-style reuse Milestone 12
established is applied again: this layer's own schema for
`sources`/`evidence` is built from `DecisionProfileSchema.shape.sources`/
`.shape.evidence` (Zod's own field-accessor), so the shape is sourced
entirely from `lib/decision`'s own public schema export, never a fresh
import into `lib/research`.

---

## 6. Data Flow

```
DecisionProfile
  (from lib/decision — either obtained directly, e.g. from
   synthesizeDecision()'s own result, or via AnalysisSession.result
   once a session reaches "completed")
        │
        ▼
buildVerificationSummary(profile)
        │
        ├─ confidence            ← profile.confidenceSummary                (verbatim, unchanged)
        ├─ sources                ← profile.sources                            (verbatim, unchanged)
        ├─ sourceBreakdown   ← count(profile.sources), count(unique domains)     (real, simple counting)
        │
        ├─ verifiedClaims    ← profile.keyFindings.filter(f => f.evidence.length > 0)
        │                        + profile.criticalRisks (always qualifies — RiskFinding's
        │                          own schema already guarantees evidence.length >= 1)
        │
        ├─ unverifiedStatements ← profile.decisionLimitations + profile.openQuestions  (verbatim)
        │
        └─ verificationCounts ← count(verifiedClaims), count(unverifiedStatements),
                                    verifiedCount / (verifiedCount + unverifiedCount)
        ▼
VerificationSummary
```

Every arrow above is either a direct pass-through or a simple count —
there is no step in this diagram that computes a new judgment about the
business, the market, or the decision itself.

---

## 7. Interaction With Existing Milestones

- **Consumes `lib/decision`'s public barrel** (Milestone 10): the
  `DecisionProfile`, `Finding`, `RiskFinding`, `FindingCategory`,
  `DecisionConfidence` types/schemas, all imported from `"@/lib/decision"`
  directly — never a deep path into `lib/decision/schemas/...` or
  `lib/decision/findings/...`.
- **Consumes `lib/analysis-session`'s public barrel** (Milestone 12) for
  exactly one type (`AnalysisSession`), used only by the convenience
  wrapper.
- **Does not import `lib/pipeline`** — Verification has no orchestration
  concern, so it has no need for `PipelineExecution` or any Pipeline
  concept directly.
- **Does not modify** `lib/research/`, `lib/competitors/`, `lib/market/`,
  `lib/financial/`, `lib/business/`, `lib/decision/`, `lib/pipeline/`,
  `lib/analysis-session/`, `lib/store/`, `app/api/`, or `lib/schemas/` —
  every one of those remains exactly as built.

---

## 8. Why This Milestone Belongs After Milestone 12

Three separate reasons, not one:

1. **Backlog sequencing.** `PRODUCT_BACKLOG.md` lists **Analysis
   Experience** and **Trust & Evidence** as the two Priority 1
   categories, in that order. Milestones 11–12 closed the first; this
   milestone closes the second. Nothing about this milestone's own data
   required waiting — the *product roadmap* did.
2. **A real, not hand-waved, technical dependency.** The convenience API
   (`buildVerificationSummaryFromSession`) genuinely cannot exist before
   Milestone 12 does — it depends on the `AnalysisSession` type Milestone
   12 defined. This is a real import, not a narrative connection.
3. **The natural place a user looks for this.** Once Milestone 12 gives a
   dashboard a session to look at — a Timeline showing what happened, a
   progress bar showing how far along it is — the *next* question a
   skeptical founder asks is "how much of this should I actually
   believe?" A Verification Summary is the direct answer to that
   question, and it is only useful once there is a completed session to
   attach it to. Building it before Milestone 12 would have meant
   building it against a `DecisionProfile` with nowhere for a dashboard
   to find it.

---

## 9. Why No Storage, Lifecycle, or State Machine

Milestones 11 and 12 each needed real persistence and a real state
machine, because each was modeling something that happens **over
time** — a multi-stage execution, a session that can be interrupted and
resumed. A Verification Summary models none of that. It is a pure
function of data that already exists and is already stored elsewhere (by
Decision Intelligence, or indirectly via a Session's own execution
record). Giving it a `storage/` folder would mean persisting a second
copy of facts Decision Intelligence already owns — precisely the
"derived, not duplicated" violation Milestone 12's own design explicitly
avoided. **This is a deliberate, considered absence, not an oversight**
— the Definition of Done treats "no storage/lifecycle/state-machine
exists" as something to verify, not something missing.

---

## 10. Risks

- **Naming risk — addressed directly in Section 1.** The prior draft's
  `lib/trust-report/` risked exactly the mistake Milestone 12's own
  design review caught for `lib/session/`: naming a layer after one
  artifact it produces rather than the capability it provides. This
  revision resolves it by renaming to `lib/verification/` /
  `VerificationSummary` before implementation begins, rather than
  discovering it mid-build as Milestone 12 did.
- **An honestly empty or thin summary in this environment.** With no
  search-provider credentials configured, a real `DecisionProfile` today
  has few or no sources, and `deriveFindings()`/`deriveCriticalRisks()`
  (Milestone 10, still architecture-only) return `[]`. A Verification
  Summary built from that profile will show zero verified claims and a
  low confidence — the **correct**, honest result, not a bug. Worth
  flagging so this isn't mistaken for broken output during a demo.
- **Upstream placeholders limit today's usefulness.** Because
  `deriveFindings`/`deriveCriticalRisks` are still placeholders, this
  milestone's `verifiedClaims` will often be empty until a future
  milestone makes those real. This milestone's value is fully realized
  only once that upstream work lands — but the packaging layer being
  ready *now* means zero additional work is needed here when it does
  (see Section 11).
- **Scope-creep risk.** The temptation to "just add a quick heuristic"
  for generating a Finding or a confidence adjustment inside this layer
  must be resisted — that is explicitly Decision Intelligence's job
  (Milestone 10's own future roadmap), not this milestone's.

---

## 11. Future Extensibility

- **Automatic enrichment once upstream placeholders become real.** The
  moment `lib/decision`'s `deriveFindings()`/`deriveCriticalRisks()` gain
  real implementations, `VerificationSummary.verifiedClaims` becomes
  richer with **zero changes to this layer's own code** — a direct
  validation that a "pure presentation over existing data" design ages
  well.
- **Citation hyperlinking.** `VerifiedClaim.evidence` already carries
  everything a future "click a claim, jump to its source" UI feature
  would need — this milestone doesn't build the UI, but it removes every
  data-shaping blocker in front of it.
- **Cross-session trust comparison.** Once Session history/versioning
  exists, comparing two Verification Summaries for the same idea
  (before/after a re-analysis) is a natural, additive extension — not
  something this milestone needs to anticipate further than not
  blocking it.
- **A "trust score" badge.** `verificationCounts.verifiedRatio` is
  already the exact number a future dashboard summary card would want —
  this milestone computes it; a future one decides how to badge it, and
  is free to label that badge "Trust Report" or "Trust Score" as a pure
  copy decision (Section 1).

None of the above is stubbed, scaffolded, or partially built now — each
is a note that the chosen design does not block it, not a plan to start
it.

---

## 12. Verification Strategy

Same bar as every prior milestone:

- `npx tsc --noEmit`, `npx eslint app components lib hooks`, `npm run
  build` — zero errors beyond the pre-existing `Testimonials.tsx` issue.
- A temporary scratch page, exercised against the running dev server and
  deleted before the final build, verifying: `buildVerificationSummary`
  against a hand-seeded `DecisionProfile` with a mix of evidence-backed
  and evidence-free `Finding`s, confirming the verified/unverified split
  is exactly correct; that `confidence`/`sources` are reused verbatim
  (identity/value-equality against the source profile's own fields, not
  recomputed); that a `RiskFinding` always lands in `verifiedClaims`
  (never possible for it not to, given Milestone 10's own schema
  guarantee); `buildVerificationSummaryFromSession` returning `null` for
  a freshly-created (not yet completed) real session, and a real
  `VerificationSummary` once that same session reaches `completed`
  (using a real `createSession()` run, the same technique Milestone 12's
  own verification used); and that no code path in this module ever
  imports or instantiates any kind of store.

---

## 13. Relationship to Decision Intelligence

Decision Intelligence (Milestone 10) and Verification (this milestone)
sit right next to each other in the stack, and it is easy to mistake one
for doing the other's job. They don't overlap — Decision Intelligence
**synthesizes**, this milestone **explains and exposes the reasoning**
behind what was already synthesized. Neither should ever duplicate the
other's output.

| Dimension | Decision Intelligence (`lib/decision/`) | Verification (`lib/verification/`, this milestone) |
|---|---|---|
| **Responsibility** | Synthesizes a `DecisionProfile` by combining Research/Competitor/Market/Financial/Business into one coherent analysis. | Classifies and organizes an *already-synthesized* `DecisionProfile` so a person can see what backs it. |
| **Ownership** | Owns synthesis: thesis, findings, red flags, confidence math, readiness, recommendations. | Owns presentation of trust: verified/unverified classification, evidence grouping, source breakdown. |
| **Source of truth** | Yes — `DecisionProfile` is the authoritative record. | No — holds no fact of its own; every value traces back to a `DecisionProfile`. |
| **Inputs** | The five knowledge platforms (Research, Competitor, Market, Financial, Business), via their own `discover*`/`synthesize*` calls. | A `DecisionProfile` (or an `AnalysisSession` wrapping one) — nothing else. |
| **Outputs** | `DecisionProfile` — `keyFindings`, `criticalRisks`, `confidenceSummary`, `sources`, `evidence`, `investmentThesis`, etc. | `VerificationSummary` — `verifiedClaims`, `unverifiedStatements`, `sourceBreakdown`, `verificationCounts`. |
| **Confidence** | *Computes* it — `computeDecisionConfidence()` is the only place this math happens. | *Reuses* it verbatim — never recomputes, only re-presents `DecisionConfidence` unchanged. |
| **Evidence** | *Gathers* it — `aggregateEvidence()` merges evidence across all five platforms. | *Organizes* it — groups already-gathered evidence by claim and counts sources; never adds a new `Evidence` entry. |
| **Unknowns** | *Records* them — `decisionLimitations`/`openQuestions` is Decision Intelligence's own honest ledger of gaps. | *Surfaces* them — presents that same ledger as the "unverified" side of the summary, unchanged. |
| **Consumers** | This milestone; `lib/pipeline` (via its decision stage); `lib/analysis-session` (via `context.decision`). | A future Dashboard — the first layer whose sole purpose is human-facing trust presentation. |

If a future change to either layer starts to look like it needs to read
the *other's* internal computation logic rather than its public output,
that is a signal the boundary above has been crossed.

---

## 14. User Questions Answered

These are real questions a skeptical founder would ask about an
analysis — the same posture `CLAUDE.md` requires Atlas AI to take toward
an idea, turned back onto Atlas AI's own output. Each is mapped honestly
to what this milestone actually answers versus what it only exposes the
raw material for:

| User question | Answered by | How |
|---|---|---|
| "Which sources support this?" | Directly | `VerificationSummary.sources`, and each `VerifiedClaim.evidence[].source`. |
| "Which evidence supports this statement?" | Directly | `VerifiedClaim.evidence` for the specific finding/risk in question. |
| "Which statements are assumptions?" | Directly | `unverifiedStatements`. |
| "What is verified?" | Directly | `verifiedClaims`. |
| "What is unknown?" | Directly | `unverifiedStatements` (the same `decisionLimitations`/`openQuestions` ledger, unchanged). |
| "Why is confidence only 74%?" | Directly | `confidence`'s four separate dimensions (`evidenceConfidence`, `coverage`, `unknownPercentage`, `dataFreshnessDays`) let a person see *which* dimension is low, instead of one opaque number. |
| "Which findings have weak evidence?" | Directly | Each `VerifiedClaim.evidence.length` and `.confidence` can be inspected per claim. |
| "Why should I trust this recommendation?" | Directly | The whole `VerificationSummary`, read alongside the `verifiedClaims` tied to that recommendation's category. |
| "What would increase confidence?" | Partially | The four confidence dimensions make it visible *which factor is low* (e.g. low `coverage`), but this milestone does not compute a recommendation like "add two more sources" — that inference is left to the reader or a future feature. |
| "Why is this score high?" | Partially / depends what "score" means | If "score" refers to `confidenceSummary`, this milestone fully explains it (see above). If it refers to a business/market/financial quality score from another platform's own scoring engine, this milestone does not touch that number at all — it is out of scope, and this document does not claim otherwise. |

The honest caveats on the last two rows matter: this milestone exposes
the *material* needed to reason about confidence and trust, but it does
not add new judgment on top of that material. That restraint is the
whole point of Section 4's "must never own" list.

---

## 15. Product Impact

**User-visible value.** A founder currently receives a score and a
verdict with no way to see what it's built on. This milestone makes the
sourcing, the evidence behind each claim, and the confidence breakdown
directly visible for the first time — replacing "trust this because we
said so" with "here is exactly what this is based on, and here is what
we don't know yet."

**Business value.** The real user-testing feedback this milestone is
built on scored the product 5/10 and specifically cited **Trust &
Evidence** as a Priority 1 gap alongside a direct quote: the product
does not yet offer "enough trusted, actionable guidance that would
convince someone to pay for it." Trust is the specific, named blocker
between "interesting demo" and "something a founder pays for" — this is
the milestone that targets that blocker directly, not incidentally.

**Technical value.** This is close to the best-possible cost-to-value
ratio available in the roadmap right now: no new external calls, no new
storage, no new state machine — two pure functions over data that
already exists. It is also an investment that compounds: any future
report builder in `lib/decision/` (a memo, a diligence report, a summary)
can embed a `VerificationSummary` rather than re-deriving its own
evidence view, and any future UI work gets a ready-made, fully-typed
shape to render against.

**Backlog items addressed.** All six `PRODUCT_BACKLOG.md` Trust &
Evidence bullets (Section 2's table): generic-feeling information,
invisible sources, unclear fact references, hard-to-trust confidence,
under-explained conclusions, and the verified-versus-inferred ambiguity.

**Why before the next milestone.** Whatever comes next — deeper real
data in the knowledge platforms, or the Priority 2 Dashboard/Reports work
— will itself want to show evidence and confidence to a user. Building
Verification now means that work reuses this layer instead of each
future feature inventing its own ad hoc "here's why you should believe
this" presentation. This is lower-risk, more foundational work than
either of those, which is why it is sequenced first.

---

## 16. Non-Goals

Explicitly out of scope for this milestone:

- Does not gather new data or call any external provider.
- Does not improve AI quality, scoring accuracy, or synthesis logic.
- Does not redesign Decision Intelligence, Pipeline, or Analysis Session.
- Does not generate a new conclusion, `Finding`, or `RiskFinding`.
- Does not duplicate `DecisionProfile` — holds no persisted copy of its
  own data (Section 9).
- Does not compute a new confidence number of any kind.
- Does not build any UI, dashboard, or route.
- Does not add a database, store, or lifecycle/state machine.
- Does not decide how a future UI labels or brands the result (Section 1
  — "Trust Report" remains available as a presentation-layer name).

**Simplicity check performed for this revision:** beyond the naming
change (Section 1), no other module, folder, or API in the original
draft was found to exist only for theoretical future use. The
convenience wrapper `buildVerificationSummaryFromSession` was
specifically re-examined against this bar and kept, because it is a
real, one-line, already-needed dependency (Section 8, reason 2) — not
speculative scaffolding. No internal subfolder structure beyond
`lib/verification/` itself is proposed; that decision is deferred until
an implementation reveals whether more than one file is actually needed.

---

## 17. Success Metrics

Measurable outcomes that show this milestone achieved its intended user
value — this section is now a standing documentation requirement for
every future milestone design as well.

- **User-visible improvement.** Sources, per-claim evidence, and a
  four-dimension confidence breakdown are readable from a single typed
  object for the first time — previously zero of this was exposed
  anywhere outside `lib/decision`'s own internals.
- **Backlog items resolved.** All six `PRODUCT_BACKLOG.md` Trust &
  Evidence bullets (Section 2) have a direct, named field or count that
  addresses them — not a partial or implied fix.
- **Questions users can now answer.** All ten questions in Section 14
  are answerable from `VerificationSummary` alone, with the two partial
  cases explicitly caveated rather than overclaimed.
- **Technical guarantees introduced.** (1) `confidence` and `sources` on
  every `VerificationSummary` are provably identical to their source
  `DecisionProfile` fields (Definition of Done #3) — no drift possible.
  (2) Zero deep imports across the module boundary (Definition of Done
  #1). (3) No persistence layer exists for this data (Definition of Done
  #2) — a `VerificationSummary` can never go stale relative to its
  source profile, because it is never stored independently of it.
- **Adoption readiness.** Any future dashboard route or future
  `lib/decision` report builder can consume `buildVerificationSummary`
  today with zero further plumbing — the measure of "done" is that a
  UI could be wired to this output in a single function call, not that
  a UI exists yet.

---

## Definition of Done

1. `lib/verification/` exists; `buildVerificationSummary` depends only on
   `lib/decision`'s public barrel; `buildVerificationSummaryFromSession`
   additionally depends only on `lib/analysis-session`'s public barrel.
   Zero deep imports anywhere (grep-verified, the same technique
   `ARCHITECTURE_REVIEW.md` Check 1 used).
2. Confirmed by inspection: **no** `storage/`, `lifecycle/`, or state
   machine exists in the implementation — this is a pass/fail check, not
   a suggestion, per Section 9.
3. `confidence` and `sources` on every produced `VerificationSummary` are
   verified to be the exact same values as the source `DecisionProfile`
   — never recomputed.
4. `tsc`/`eslint`/`build` all clean.
5. A documentation file matching the depth of `EXECUTION_PIPELINE.md`/
   `ANALYSIS_SESSION.md` is written, including this design document's own
   verified risks (the empty-summary-is-correct caveat, the
   still-placeholder upstream findings).
6. Scratch verification page created, every scenario in the Verification
   Strategy passes, deleted before the final build.
7. `git status` shows only the new module and its documentation — no
   frozen path touched.
8. Nothing committed until explicitly requested.

---

## Why This Milestone Increases Atlas AI's Product Value

The first real product evaluation scored Atlas AI **5/10** and said it
"feels like a knowledge engine rather than a product... not enough
trusted, actionable guidance that would convince someone to pay for it."
Every knowledge platform through Decision Intelligence already does the
hard, honest work `CLAUDE.md`'s own founding vision demands — never
inventing a statistic, stating an assumption plainly when something is
unknown, backing every red flag with real evidence by schema
construction, not convention. **That rigor is currently invisible.** A
founder reading today's output has no way to see any of it — the
sourcing, the confidence math, the explicit "here is what we don't know"
ledger all exist, buried, unread.

Milestone 13 is the smallest possible change that makes that rigor
*visible*. It adds no new intelligence and no new claims about the
business — it simply stops hiding the evidence Atlas AI already has. That
is precisely the difference between "a knowledge engine" and "a product
someone would trust enough to act on."

---

*End of design specification. Awaiting review before any implementation
begins.*
