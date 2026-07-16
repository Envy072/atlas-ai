# Atlas AI — Milestone 33 Design Specification

**Decision Intelligence — The Traceability Verification Layer
(Phase 2, Checkpoint A)**

Status: **Design only. No code, no folders, no source files modified.
No commits.**

---

# 1. Goal

**Purpose.** Build the one mechanism this entire product's central
promise depends on: a pure, standalone function that takes a single
candidate claim — produced by *anything*, today or in the future,
including an LLM that hasn't been wired to it yet — and an array of
real, already-aggregated `Evidence`, and decides, deterministically,
whether that claim is **traceable**: does every piece of evidence it
cites actually resolve to a real entry in that array? If yes, the
claim is `"matched"`. If no — no citation at all, or a citation that
doesn't resolve — the claim is `"rejected"`, in full, with no partial
credit.

Per `ATLAS_AI_ROADMAP.md`'s own naming for this exact milestone, this is
**Phase 2's Checkpoint A** — a formal GO/NO-GO gate. Milestones 34–37
(the four real generation functions behind `deriveFindings()`,
`deriveCriticalRisks()`, `buildInvestmentThesis()`, and
`buildRecommendation()`'s calling logic) do not begin until this
milestone's own exit criteria are met. That sequencing is not a
scheduling preference — it is the single most load-bearing ordering
decision in this entire roadmap, and this document treats it that way
throughout.

**Why this, and why now, in exactly this shape.** `ATLAS_AI_V2_FINAL.md`
(Section 5) states the product's first principle as "never fabricate" —
"an AI-generated finding without evidence is worse than no finding at
all." Zod schema validation, already in place across every knowledge
platform, enforces that a `Finding`/`RiskFinding` has the *right shape*
— it cannot enforce that a `summary` string is *actually substantiated*
by the `Evidence[]` sitting next to it. A schema-valid `Finding` can
still carry a fabricated summary paired with real-but-irrelevant
evidence, and Zod would never know. Closing that specific gap —
without needing a semantic-truth judgment this milestone explicitly
does not attempt (Section 4) — is this milestone's entire job.

**Why this is not a new engine, and not a duplicate of an existing
one.** The audit below (Section 5) confirms `lib/verification/`
(Milestone 13) already exists — and is a fundamentally different layer
solving a fundamentally different problem, at a different point in
time. `lib/verification/`'s `buildVerificationSummary()` runs *after*
a `DecisionProfile` is already fully built, over findings/risks that
*already* carry evidence (by schema construction, for `RiskFinding`; by
its own explicit pre-filter, for `Finding`) — it counts and summarizes
what's already there, for a trust-panel display. This milestone's
function runs *before* a candidate claim is ever allowed to become a
`Finding`/`RiskFinding` at all — it is the gate a real generation
function (Milestone 34+) must pass a claim through *before* calling
`buildFinding()`/`buildRiskFinding()`, not a report over what already
passed. One answers "how much of this finished profile is verified?"
The other answers "should this one candidate claim ever be allowed into
the profile in the first place?" Different questions, different
timing, both real, neither redundant with the other.

**Fit with long-term architecture.** This adds one new, small subfolder
to `lib/decision/` — `traceability/` — following the exact folder-per-
concern shape every other subfolder here already uses
(`evidence/`, `findings/`, `redflags/`, `readiness/`, `recommendations/`,
each with its own file(s) and `index.ts` barrel). It is additive only:
zero existing file changes shape, zero existing schema changes shape,
and the function this milestone builds has **zero callers** when this
milestone ends — exactly the same "architecture ready, not yet wired"
posture `buildInvestmentMemo`/`buildDueDiligenceReport`/
`buildExecutiveSummary` held for roughly twenty milestones before
Milestone 31 wired them. Milestone 34 is this function's first real
caller, not this milestone.

---

# 2. Scope

### Included

- One new Zod schema, `CandidateClaimSchema` (`lib/decision/schemas/`),
  defining the shape a not-yet-built future generation step must
  eventually produce: a claim's text plus the evidence ids it claims to
  be citing. Validated the same way every other AI-adjacent boundary
  shape in this codebase is validated — `parseOrThrow`, never a bespoke
  check.
- One new pure function, `verifyClaimTraceability()`
  (`lib/decision/traceability/`), taking one `CandidateClaim` and the
  `Evidence[]` array already aggregated by `aggregateEvidence()`
  (Milestone 10, unmodified), returning a `ClaimVerificationResult`:
  `"matched"` with the real, resolved `Evidence` objects, or
  `"rejected"` with a stated reason.
- A permanent, exhaustive unit-test suite for both the schema and the
  function — every case the roadmap names by name (successful match,
  failed match, missing evidence, invalid id) plus the boundary cases
  this audit surfaces as necessary to actually trust a "highest-risk"
  milestone's own correctness (Section 12).
- Public barrel updates: `lib/decision/traceability/index.ts` (new),
  `lib/decision/schemas/index.ts` and `lib/decision/index.ts` (both
  extended, not restructured) so this milestone's own two new exports
  are reachable the same way every other `lib/decision/` export already
  is.

### Excluded (see Non-Goals, Section 4, for the full list with reasoning)

- Any real LLM call, any prompt, any generation logic whatsoever.
- Wiring this function into `deriveFindings()`, `deriveCriticalRisks()`,
  `buildInvestmentThesis()`, or `buildRecommendation()`'s calling logic
  — all four remain exactly as honestly-empty as they are today.
  Milestones 34–37, not this one.
- Any semantic/content check of whether a claim's text is actually
  *true* given the evidence's content — an NLP/LLM-judgment problem,
  explicitly not what "traceability" means in this design.
- Any change to `Evidence`, `Finding`, `RiskFinding`, or any other
  existing schema.
- Any monitoring, logging, or incident-tracking infrastructure for a
  rejected claim — `ATLAS_AI_V2_ROADMAP.md` places that at Milestone 39
  (the private cohort), not here.
- Any UI, route, or component change. This milestone has zero
  product-visible surface.

**Feature-creep guard:** every deliverable below is either (a) the one
new schema, (b) the one new pure function, or (c) a test observing
behavior this design specifies. If a deliverable would require a
judgment about whether a claim's *content* is correct — rather than
whether its *citations resolve* — it does not belong in this milestone.

---

# 3. Deliverables

1. **`lib/decision/schemas/candidateClaim.schema.ts`** — new file,
   alongside `finding.schema.ts`/`riskFinding.schema.ts` (same folder,
   same pattern):

   ```ts
   export const CandidateClaimSchema = z.object({
     summary: z.string().min(1),
     citedEvidenceIds: z.array(z.string()),
   });
   export type CandidateClaim = z.infer<typeof CandidateClaimSchema>;
   ```

   `citedEvidenceIds` is deliberately allowed to be an empty array at
   the schema level (a structurally valid, but meaningfully rejectable,
   input — Section 7 explains why this isn't pushed into the schema
   itself via `.min(1)`, unlike `RiskFindingSchema`'s own `evidence`
   field).

   **This schema is deliberately narrow — the traceability contract
   only, not a complete candidate finding.** It carries exactly the two
   fields this milestone's own verification step needs (a claim's text,
   and the evidence ids it cites) and nothing else. `category`,
   `severity`, and `confidence` — all required by `buildFinding()`/
   `buildRiskFinding()` — are explicitly not part of this shape; they
   belong to whatever larger "candidate finding" contract Milestone 34
   defines when real generation is designed. See Section 6's flow
   description for exactly how this narrower contract is expected to
   fit into that larger, not-yet-designed shape.

2. **`lib/decision/traceability/claimVerifier.ts`** — new file:

   ```ts
   export type ClaimVerificationStatus = "matched" | "rejected";

   export interface ClaimVerificationResult {
     status: ClaimVerificationStatus;
     resolvedEvidence: Evidence[];
     reason?: string;
   }

   export function verifyClaimTraceability(
     claim: CandidateClaim,
     availableEvidence: Evidence[]
   ): ClaimVerificationResult { /* Section 7 */ }
   ```

3. **`lib/decision/traceability/claimVerifier.test.ts`** — new file,
   this function's (and this schema's) first test, Tier 1 (pure, no
   mocking) — the exhaustive case list is Section 13's own Acceptance
   Criteria, not duplicated here.
4. **`lib/decision/traceability/index.ts`** — new, one-line public
   barrel: `export { verifyClaimTraceability } from
   "@/lib/decision/traceability/claimVerifier"`, matching every sibling
   subfolder's own barrel shape exactly.
5. **`lib/decision/schemas/index.ts`** — one new line added:
   `export * from "@/lib/decision/schemas/candidateClaim.schema"`.
6. **`lib/decision/index.ts`** — one new line added:
   `export { verifyClaimTraceability } from
   "@/lib/decision/traceability/claimVerifier"`, alongside this
   barrel's existing `findings/`/`redflags/`/`evidence/` exports.

Nothing else changes.

---

# 4. Non-Goals

- **Any LLM call, prompt, or model integration of any kind.** The
  roadmap's own name for this milestone — "build the lock before
  building the door" — is the literal governing constraint. This
  function has no opinion about *how* a claim is generated; it only
  ever receives one, already-shaped, and judges it.
- **Wiring into `deriveFindings()`/`deriveCriticalRisks()`/
  `buildInvestmentThesis()`/`buildRecommendation()`.** All four remain
  untouched, at their current, honestly-empty state. This is
  `ATLAS_AI_V2_ROADMAP.md`'s own explicit Checkpoint B (Milestones
  34–37), gated behind this milestone's own exit criteria (Section 13),
  not folded into it.
- **Semantic/content verification.** "Traceability" in this design
  means exactly one thing: every evidence id a claim cites must resolve
  to a real `Evidence` object already in the aggregated pool. It does
  **not** mean checking whether the claim's `summary` text is an
  accurate characterization of that evidence's actual content — that
  would require exactly the kind of LLM-based semantic judgment this
  milestone is structurally forbidden from using. Named honestly as a
  real, remaining gap this milestone does not close (Section 12) —
  narrower than "verified true," which this document never claims.
- **A confidence threshold or scoring adjustment.** This function
  returns `"matched"`/`"rejected"`, never a partial-confidence
  judgment — `DecisionProfile.confidenceSummary`'s own computation
  (`computeDecisionConfidence()`, Milestone 30, unit-tested) is a
  separate, already-correct concern this milestone does not touch or
  duplicate.
- **Batch/multi-claim verification.** The function verifies exactly one
  candidate claim per call, matching the roadmap's own singular
  phrasing ("a generated claim," not "a batch of claims") and this
  codebase's own single-construction precedent (`buildFinding`,
  `buildRiskFinding` are each one-object-at-a-time). A batch wrapper is
  a trivial, un-premature addition for whichever Milestone 34+ caller
  actually needs one — not built speculatively here.
- **Any monitoring, alerting, or incident log for a rejected claim.**
  `ATLAS_AI_V2_ROADMAP.md` Milestone 39 (the private cohort) is where
  "treat a fabrication incident like a security incident" becomes real
  tooling. This milestone returns a `reason` string on rejection —
  sufficient for a future caller to log it, not sufficient reason to
  build a logging *system* here.
- **Any change to `lib/verification/`.** A distinct, already-live,
  already-correct module (Milestone 13) solving a different problem at
  a different point in the lifecycle (Section 1). Not touched, not
  extended, not renamed.
- **Any change to `Evidence`, `Finding`, `RiskFinding`, or any other
  existing schema.** `CandidateClaimSchema` is additive, standing
  entirely on its own.

---

# 5. Current State Audit

Every claim below is from a direct read this session, not memory.

## 5.1 `lib/verification/` — confirmed real, confirmed a different layer

Four files (`buildVerificationSummary.ts`,
`buildVerificationSummaryFromSession.ts`, `schemas/verification.schema.ts`,
`index.ts`), all from Milestone 13, all still exactly as originally
built:

- `VerificationSummarySchema` — `confidence`, `sources`,
  `sourceBreakdown`, `verifiedClaims: VerifiedClaim[]`,
  `unverifiedStatements: string[]`, `verificationCounts`,
  `generatedAt`.
- `buildVerificationSummary(profile: DecisionProfile)` — confirmed by
  direct read: filters `profile.keyFindings` for `evidence.length > 0`,
  maps every `RiskFinding` (already schema-guaranteed non-empty
  evidence) and every evidence-bearing `Finding` into a
  `VerifiedClaim`, and computes a simple ratio. **It never gathers new
  evidence, never rejects a `Finding`/`RiskFinding` from the profile,
  and never runs before a `DecisionProfile` is already complete.**

This confirms Section 1's claim precisely: this is a downstream
reporting layer over an already-finished profile, not a pre-admission
gate. Nothing in this milestone's design overlaps its responsibility.

## 5.2 `Evidence`, `Finding`, `RiskFinding` — confirmed exact shapes

- **`EvidenceSchema`** (`lib/research/schemas/evidence.schema.ts`):
  `{ id: string, claim: string, evidence: string, confidence: number,
  source: Source, url: string, retrievedAt: string }`. Confirmed: every
  `Evidence` object already carries an `id` — the exact field this
  milestone's `citedEvidenceIds` resolves against — and already carries
  its own `claim` field, populated today (`researchOrchestrator.ts`,
  confirmed by direct read) with a research-stage placeholder (a
  source's own title), explicitly "until a future pipeline stage builds
  a more specific claim from it." This milestone's `CandidateClaim` is
  that future, more specific claim — a distinct concept from
  `Evidence.claim`, not a rename of it.
- **`FindingSchema`**: `evidence: z.array(EvidenceSchema)` — may
  legitimately be empty.
- **`RiskFindingSchema`**: `evidence: z.array(EvidenceSchema).min(1)` —
  structurally cannot be empty. Confirms directly, in the schema
  itself, exactly the gap this milestone closes one layer earlier:
  Zod already guarantees a `RiskFinding` *has* evidence; it has no way
  to guarantee that evidence actually substantiates the `summary`
  text next to it.
- **`buildFinding()`/`buildRiskFinding()`** (`findings/findingBuilder.ts`,
  `redflags/riskFinding.ts`): both pure constructors, both already
  `parseOrThrow`-validated, both confirmed to have exactly one caller
  each today — their own `derive*()` sibling in the same file, which
  returns `[]` unconditionally. **Audit precision, corrected per the
  Principal Architect Review (Finding 3):** a bare grep for
  `buildFinding`/`buildRiskFinding` returns additional hits beyond
  `findingBuilder.ts`/`riskFinding.ts` — but every one of them is a
  locally-scoped test helper function of the same name, hand-defined
  inside `dueDiligenceReport.test.ts` and `executiveSummary.test.ts`
  (e.g. `function buildFinding(overrides: Partial<Finding> = {}):
  Finding { ... }`), not a call to the real, imported constructor from
  `findingBuilder.ts`. These are coincidentally-named local fixtures,
  confirmed by reading each hit's surrounding context rather than
  trusting the grep match alone — a distinction worth stating
  explicitly here, since a future reader re-running the same grep
  without checking each hit could otherwise mistake them for real
  callers. With that distinction made, zero real callers of the actual
  constructors exist anywhere outside their own `derive*()` sibling.
  This is precisely where a future Milestone 34/35 caller will sit:
  call `verifyClaimTraceability()` first, then call `buildFinding()`/
  `buildRiskFinding()` only for a `"matched"` result, using
  `resolvedEvidence` as the constructor's own `evidence` argument.

## 5.3 `aggregateEvidence()` — confirmed the real source of the pool this milestone verifies against

`lib/decision/evidence/evidenceAggregator.ts`, confirmed unmodified and
unmodified by this design: merges every upstream platform's own
`Source[]`/`Evidence[]` lists, deduplicated by normalized URL
(`dedupeByKey`/`urlDedupeKey`, Technical Debt #1, unrelated to this
milestone). Its output (`AggregatedEvidence.evidence: Evidence[]`) is
exactly the array this milestone's function takes as its second
argument — already real, already live, already flowing since
Milestone 32 activated real providers. **This milestone depends on
Milestone 32 for exactly one reason: without real evidence, every test
case here would only ever exercise trivial/empty arrays.** With
Milestone 32 shipped, this milestone's own tests can (and do, Section
13) exercise a realistic, populated evidence pool.

## 5.4 `parseOrThrow` — confirmed the one, correct validation seam

`lib/validation/parse.ts`: `parseOrThrow<T>(schema, data, message?):
T`, throwing `ValidationError` (not a bare `Error`) on failure —
already this codebase's single validation mechanism, reused here
verbatim for `CandidateClaimSchema`, not reimplemented.

## 5.5 Folder/barrel convention — confirmed, followed exactly

Every existing `lib/decision/` subfolder (`evidence/`, `findings/`,
`redflags/`, `readiness/`, `recommendations/`, `refresh/`, `confidence/`,
`memo/`, `diligence/`, `executive/`) follows the identical shape: one
or more implementation files, a co-located `.test.ts` (where tests
exist), and a one- or two-line `index.ts` re-exporting only the public
surface. `traceability/` (Deliverable 2–4) is the eleventh instance of
this exact shape, not a new one.

## 5.6 Architectural constraints

- **`CLAUDE.md` Section 3's six-layer architecture** applies in full:
  this is pure business logic (no external I/O, no framework import),
  living in `lib/decision/` per that layer's own definition. No service
  wrapper is warranted — the same reasoning `MILESTONE_31_DESIGN.md`
  Section 7 already established for `buildExecutiveSummary`/
  `buildInvestmentMemo`/`buildDueDiligenceReport` (pure, zero-I/O,
  single-purpose functions are called directly, never behind a bare
  service rename) applies with equal force to a function with even
  fewer inputs and no persistence concern at all.
- **"Never fabricate data"** (`CLAUDE.md` Section 1) is this
  milestone's entire reason to exist, restated here as the binding
  design constraint it is: fail closed, always. Any ambiguous case
  (Section 12) resolves toward `"rejected"`, never toward a permissive
  `"matched"`.
- **Schema-first, additive evolution** (`CLAUDE.md` Section 22): this
  milestone adds one new schema and touches zero existing ones — the
  same discipline every knowledge-platform schema addition (e.g.,
  `Evidence.claim` itself, added ahead of its own future consumer) has
  already followed.
- **No LLM usage anywhere in `lib/decision/` today** (confirmed by
  grep: zero imports of `lib/services/openai.ts` anywhere under
  `lib/decision/`). This milestone keeps that true.

---

# 6. Calling Flows

There is no end-user-facing flow this milestone changes — this section
describes the two flows that actually exist: how this milestone's own
tests exercise the function today, and how a future Milestone 34+
caller is expected to use it once it exists.

### This milestone's own test flow (the only real caller today)

1. A test constructs a `CandidateClaim` (`{ summary, citedEvidenceIds }`)
   and an `Evidence[]` array (via `buildDecisionProfileFixture`'s
   existing evidence-construction path, or a small local array for a
   narrowly-scoped case).
2. It calls `verifyClaimTraceability(claim, evidence)`.
3. It asserts the returned `status`, `resolvedEvidence`, and (for a
   rejected case) `reason`.

### The intended future flow (Milestone 34+, not built here)

**Scope clarification, added per Principal Architect Review (Finding
1): `CandidateClaim` is deliberately *only* the traceability contract —
`summary` plus `citedEvidenceIds` — not a complete, ready-to-persist
candidate `Finding`/`RiskFinding`. It intentionally does not carry
`category`, `severity`, or `confidence`. Those three fields belong to a
larger "candidate finding" shape that Milestone 34's own design has not
yet been written and is responsible for defining — this milestone
verifies the citation trail of a claim's text, nothing more, and the
flow below is written to reflect that narrower scope precisely, not to
imply this contract alone is sufficient to construct a full `Finding`.**

1. A real generation step (not yet built) produces a raw candidate
   claim. Whatever larger shape Milestone 34 settles on for a full
   candidate finding (carrying `category`/`severity`/`confidence`
   alongside a claim's text), its `summary`-plus-cited-ids portion is
   structurally validated first via
   `parseOrThrow(CandidateClaimSchema, rawOutput)` — this milestone's
   contract governs only that slice.
2. The validated `CandidateClaim` is passed to
   `verifyClaimTraceability()` alongside the `DecisionProfile`'s own
   `evidence` array (already aggregated, Milestone 10/32).
3. On `"matched"`, the caller combines `resolvedEvidence` with the
   *other* fields Milestone 34's own candidate-finding shape supplies
   (`category`, `severity`, `confidence` — not part of this milestone's
   contract) to call `buildFinding()`/`buildRiskFinding()`, constructing
   a real, schema-valid, now-also-traceability-verified claim. This
   milestone does not design, and does not need to design, where those
   other fields come from — only that this function's own output
   (`resolvedEvidence`) is what supplies the `evidence` argument those
   constructors already require.
4. On `"rejected"`, the caller drops the claim entirely — per
   `ATLAS_AI_V2_FINAL.md` Section 5's own instruction, "dropped, not
   shown with a caveat." What a Milestone 34+ caller does with a
   rejected claim beyond dropping it (retry? log? both?) is that
   milestone's own decision, not this one's.

### Edge case — an empty evidence pool

A `CandidateClaim` citing any id at all against an empty
`availableEvidence` array resolves to `"rejected"` — no id can resolve
against nothing. Covered explicitly in Section 13's Acceptance Criteria,
not a hypothetical.

### Edge case — a claim citing zero evidence ids

Rejected immediately, before any lookup is attempted — an uncited claim
is, by definition, untraceable. This is the literal meaning of "missing
evidence," the exact case the roadmap names by name.

---

# 7. Architecture

### Why `CandidateClaimSchema` allows an empty `citedEvidenceIds` array, unlike `RiskFindingSchema`'s `.min(1)`

Examined directly rather than copied by default: `RiskFindingSchema`'s
`.min(1)` makes an empty-evidence `RiskFinding` *impossible to
construct at all* — the right rule for an object that has already
passed every other check and is about to be persisted as a real risk.
`CandidateClaimSchema` sits one step earlier: it must still accept an
uncited claim as *structurally valid input*, specifically so
`verifyClaimTraceability()` — not the schema — is the single place
that decides what happens to it, with a real `reason` string
(`"rejected: no evidence cited"`) attached rather than a generic Zod
validation failure. Pushing this into the schema would silently
collapse two different failure modes (a malformed candidate vs. a
well-formed-but-uncited one) into one identical `ValidationError`,
losing the distinction the roadmap's own "missing evidence" case
explicitly asks to be tested for.

### Why `verifyClaimTraceability()` fails closed on *any* unresolved id, not just when *all* ids fail

The riskier, more permissive alternative — accept the claim if *at
least one* cited id resolves, silently drop the rest — was considered
and rejected. A claim citing three ids where only one is real is not
"one-third traceable"; it is a claim that already contains at least one
fabricated citation, and `ATLAS_AI_V2_FINAL.md`'s own governing
principle (Section 5, restated in Section 4 above) draws no distinction
between "fully fabricated" and "partially fabricated" — both are a
lie with a confident tone. Failing the entire claim on any single
unresolved id is the conservative, correct reading of "zero tolerance,"
and is cheap to relax later if a future milestone finds real evidence
this is too strict — it is not cheap to discover the opposite mistake
after real claims have already reached a founder.

### Evidence-id comparison semantics — stated explicitly, per Principal Architect Review Finding 4

Not previously specified, and now fixed as a deliberate, binding design
decision rather than left implicit: **an id comparison is an exact
string match — case-sensitive, with no trimming or normalization of any
kind — and fails closed on any mismatch.** A cited id that differs from
a real `Evidence.id` by so much as a trailing space or a single
differently-cased character does **not** resolve, and the claim is
rejected exactly as if the id didn't exist at all. This matters
concretely because the eventual real source of a cited id (Milestone
34's own, not-yet-built generation step) is an LLM's structured output —
a source genuinely prone to small formatting drift (whitespace,
casing) that a more forgiving comparison might be tempted to paper
over. Fuzzy-matching or normalizing an id before comparison would
reintroduce exactly the kind of "close enough" tolerance this entire
milestone exists to eliminate: an id is either the real one or it
isn't, and this function never guesses which one a "close" string
was probably supposed to be. `Map.prototype.get`'s own native string
equality (used in Section 7's implementation shape below) already
gives this for free — no trimming, casing, or fuzzy-match helper is
added anywhere in this design.

### Why duplicate cited ids are silently deduplicated, not rejected

A candidate citing the same real evidence id twice is not lying about
anything — it is redundant, not fabricated. `resolvedEvidence` returns
each matched `Evidence` object once, using the same "first occurrence
wins" convention `dedupeByKey` already establishes elsewhere in this
exact module, rather than inventing a second deduplication convention.

### Why `verifyClaimTraceability()` takes the whole `CandidateClaim`, not a bare `citedEvidenceIds: string[]`

Addressed briefly, per Principal Architect Review Finding 5 (optional):
the function's own logic only ever reads `claim.citedEvidenceIds` —
`claim.summary` passes through unused. This is a deliberate interface
choice, not an oversight: the function's conceptual job is "decide
whether *this claim* is traceable," and taking the claim object keeps
that framing intact at every call site, rather than forcing a future
caller to first destructure a claim into a bare array before calling
it. It also means a future, still-narrow refinement — e.g., rejecting a
`CandidateClaim` whose `summary` is suspiciously long relative to its
citation count, without expanding this function's actual traceability
logic — would extend an existing parameter rather than requiring a
signature change at every call site. This is a real trade-off (an
unused field sits in the signature today), accepted deliberately rather
than left unexamined.

### Why this takes `Evidence[]` directly, not a `DecisionProfile`

The function's only real dependency is the aggregated evidence array —
giving it the whole `DecisionProfile` would let a future maintainer
reach for fields it has no business touching (findings, thesis,
confidence) and would make the function's own test setup depend on
constructing a full profile for every case, when most cases need only
a handful of `Evidence` objects. Minimal input surface, matching
`aggregateEvidence()`'s own precedent of taking raw lists, not a
wrapping object, as its argument.

### Why this lives in `lib/decision/traceability/`, not inside `lib/verification/`

Examined directly, given the superficial name overlap: `lib/verification/`
is Milestone 13's own module, with its own schema
(`VerificationSummarySchema`), its own single responsibility
(summarizing an already-complete profile), and its own existing
consumer path (a future trust-panel dashboard). Placing a
pre-admission gate for Decision Intelligence's own generation step
inside a sibling module built for a different, later-stage purpose
would blur exactly the boundary Section 1 spends its longest paragraph
drawing. `lib/decision/traceability/` keeps this milestone's function
where its only real caller (a future Decision Intelligence generation
step) already lives, following the same "new concern, new subfolder"
convention every other `lib/decision/` addition already uses.

### Implementation shape

```ts
// lib/decision/traceability/claimVerifier.ts
import type { Evidence } from "@/lib/research";
import type { CandidateClaim } from "@/lib/decision/schemas/candidateClaim.schema";

export type ClaimVerificationStatus = "matched" | "rejected";

export interface ClaimVerificationResult {
  status: ClaimVerificationStatus;
  resolvedEvidence: Evidence[];
  reason?: string;
}

export function verifyClaimTraceability(
  claim: CandidateClaim,
  availableEvidence: Evidence[]
): ClaimVerificationResult {
  if (claim.citedEvidenceIds.length === 0) {
    return { status: "rejected", resolvedEvidence: [], reason: "No evidence cited." };
  }

  const evidenceById = new Map(availableEvidence.map((evidence) => [evidence.id, evidence]));
  const resolved: Evidence[] = [];
  const seenIds = new Set<string>();

  for (const id of claim.citedEvidenceIds) {
    const match = evidenceById.get(id);
    if (!match) {
      return { status: "rejected", resolvedEvidence: [], reason: `Cited evidence id "${id}" does not resolve.` };
    }
    if (!seenIds.has(id)) {
      seenIds.add(id);
      resolved.push(match);
    }
  }

  return { status: "matched", resolvedEvidence: resolved };
}
```

Deliberately simple: a `Map` lookup and a loop, no external dependency,
no async, no I/O — matching the roadmap's own description, "pure
verification logic."

---

# 8. Data Model

**No database changes. No change to any existing schema.** One new,
additive Zod schema (`CandidateClaimSchema`); one new, plain
TypeScript interface (`ClaimVerificationResult`, an internal
computation result with no external boundary to cross, following
`AggregatedEvidence`'s own precedent of staying a plain interface
rather than a Zod schema). `Evidence.id`, already present since this
field's introduction, is the one existing field this design depends on
— confirmed unique per evidence object by construction
(`evidenceBuilder.ts`'s own `nextEvidenceId()` counter), not newly
relied upon.

---

# 9. API Contract

**No new or changed API route.** This function is called directly by
future business logic in `lib/decision/`, never by a route — consistent
with every other pure function in this module.

---

# 10. Security Review

- **No new data-exposure surface.** This function reads only what it's
  given; it persists nothing, logs nothing, and calls nothing external.
- **Fail-closed is itself the security property.** The entire purpose
  of this milestone is a security-shaped guarantee (never let an
  untraceable claim through) — Section 7's "fail closed on any
  unresolved id" decision is the security review's own central finding,
  not a separate concern layered on afterward.
- **No secret, credential, or PII handling of any kind.** Confirmed by
  the function's own signature — a claim's text and an evidence array,
  nothing else.

---

# 11. Performance Review

- **Computational cost:** a `Map` construction over `availableEvidence`
  (linear in evidence-pool size) plus a loop over `citedEvidenceIds`
  (linear in citation count, typically single digits) — negligible for
  any realistic `DecisionProfile` (a few dozen evidence entries at
  most, per this milestone's own realistic test fixtures, Section 13).
- **No caching need.** Called once per candidate claim, by a future
  caller that does not yet exist; nothing here is expensive enough to
  justify optimizing ahead of a real, measured need.

---

# 12. Risks

- **This is the highest-risk engineering milestone in all of Version 2,
  and this design does not soften that framing.** A silent bug in
  `verifyClaimTraceability()` — an off-by-one in id matching, a
  case-sensitivity mismatch, a dedup logic error that drops a real
  citation — would either wrongly reject real, traceable claims
  (a usability cost) or, far worse, wrongly accept an untraceable one
  (a trust-destroying cost). Mitigated the only way it credibly can be
  at this stage: an unusually exhaustive test suite (Section 13),
  written and reviewed before any real caller exists, plus the
  explicit GO/NO-GO checkpoint `ATLAS_AI_V2_ROADMAP.md` itself
  requires before Milestone 34 begins.
- **A false sense of security from the word "verification."** Named
  explicitly, twice now (Section 1, Section 4): this function verifies
  *traceability*, not *truth*. A claim can cite three real, resolvable
  pieces of evidence and still mischaracterize what they actually say —
  this milestone cannot catch that, and no phrasing in this document
  should be read as claiming it can. This gap is real, is not this
  milestone's to close, and must be named again, explicitly, in
  whatever design document eventually specifies Milestone 34's real
  generation logic — that milestone will be the one actually
  responsible for how a claim's text is produced from evidence content,
  and it inherits this gap directly.
- **An unvalidated assumption this design depends on**: `Evidence.id`
  values are unique within any single `DecisionProfile`'s aggregated
  pool. This holds today by construction (Section 5.2/8) but is not
  independently enforced by this milestone — see Section 14 for this
  and other assumptions requiring future validation.
- **Silent scope pressure toward "just wire it in now."** Once this
  function exists and passes review, the natural next impulse is to
  immediately connect it to `deriveFindings()` and call the whole
  problem solved. Mitigated by this document's own repeated, explicit
  naming of Milestones 34–37 as separate, not-yet-authorized work
  (Non-Goals, Section 4) — this milestone's success is a green light to
  *design* Checkpoint B next, not to silently fold it in here.
- **Rollback.** Fully additive: one new schema file, one new
  implementation file, one new test file, one new barrel file, two
  one-line barrel additions. Reverting the commit removes all of it
  with zero effect on any existing code, since nothing outside this new
  subfolder ever calls it.

---

# 13. Acceptance Criteria

1. [ ] `CandidateClaimSchema` exists in `lib/decision/schemas/
   candidateClaim.schema.ts`, exported from `lib/decision/schemas/
   index.ts`.
2. [ ] `verifyClaimTraceability()` exists in `lib/decision/
   traceability/claimVerifier.ts`, exported from both `lib/decision/
   traceability/index.ts` and `lib/decision/index.ts`.
3. [ ] **Successful match**: a claim citing one or more real,
   resolvable evidence ids returns `status: "matched"` with
   `resolvedEvidence` containing exactly those (deduplicated) `Evidence`
   objects.
4. [ ] **Missing evidence**: a claim with `citedEvidenceIds: []`
   returns `status: "rejected"` with a reason naming the absence of any
   citation — verified without ever attempting a lookup against
   `availableEvidence`.
5. [ ] **Invalid id (fully unresolved)**: a claim citing only ids that
   don't exist in `availableEvidence` returns `status: "rejected"`,
   `resolvedEvidence: []`.
6. [ ] **Invalid id (partially unresolved)**: a claim citing a mix of
   real and non-existent ids returns `status: "rejected"` — proving
   the fail-closed behavior (Section 7) holds even when some citations
   are genuinely real, not only when all of them are fabricated.
7. [ ] **Failed match against an empty evidence pool**: a claim citing
   any id, checked against `availableEvidence: []`, returns
   `status: "rejected"`.
8. [ ] **Duplicate citations**: a claim citing the same real id twice
   returns `resolvedEvidence` with exactly one entry for that id, not
   two.
9. [ ] **Order preservation**: `resolvedEvidence`'s order matches
   `citedEvidenceIds`'s own order (first-cited, first-returned) — a
   concrete, checkable property, not left ambiguous. (Named "order
   preservation," not "order independence," per the Principal Architect
   Review's Finding 2 — the property under test is that output order
   *depends on* citation order, the opposite of independence.)
10. [ ] `CandidateClaimSchema` itself rejects a structurally invalid
    input (e.g., `summary: ""`, or `citedEvidenceIds` containing a
    non-string) via `parseOrThrow`, throwing `ValidationError` — proving
    the schema boundary is real, not just declared.
11. [ ] `tsc --noEmit`, `eslint`, and the full `vitest run` suite (new
    and pre-existing tests together) all pass with zero new errors.
12. [ ] `git diff --stat` confirms zero files changed outside
    `lib/decision/schemas/candidateClaim.schema.ts`,
    `lib/decision/traceability/`, `lib/decision/schemas/index.ts`, and
    `lib/decision/index.ts` — no existing knowledge-platform file, no
    UI file, no route file touched.
13. [ ] Zero database changes — `git diff --stat` touches zero files
    under `supabase/migrations/`.
14. [ ] `lib/verification/` is confirmed unmodified — `git diff --stat`
    touches zero files under that path.

---

# 14. Assumptions Requiring Validation

Named explicitly, per this milestone's own risk profile (Section 12) —
each of these is believed true today, verified against the current
codebase during this design, but is not itself re-proven by this
milestone's own test suite and should be re-checked whenever it stops
being incidentally true:

1. **`Evidence.id` values are unique within one `DecisionProfile`'s
   aggregated evidence pool.** True today because
   `evidenceBuilder.ts`'s `nextEvidenceId()` uses a monotonically
   increasing in-process counter combined with a timestamp. This
   assumption would break if a future change introduced a second,
   independent evidence-construction path with its own id scheme, or
   if evidence aggregation ever merged pools built by separate server
   processes (each with their own counter starting from zero). Not
   independently enforced by `verifyClaimTraceability()` itself — the
   function's `Map`-based lookup would silently let a later duplicate
   id shadow an earlier one rather than erroring. Worth a defensive
   uniqueness check only if this assumption is ever found to be false
   in practice, not preemptively here.
2. **A future generation step (Milestone 34+) will actually produce a
   `citedEvidenceIds` field as part of its raw output**, i.e., that the
   real prompt/structured-output design for evidence-constrained
   generation will ask the model to name specific evidence ids it used,
   rather than free-form citing evidence by content alone. This is the
   single largest open question the roadmap has not yet answered in
   any design document, and this milestone's entire contract
   (`CandidateClaimSchema`) is built on the assumption that this is the
   mechanism Milestone 34 will choose. If Milestone 34's own design
   instead pursues a fundamentally different citation mechanism (e.g.,
   matching claim text against evidence content via embedding
   similarity, with no explicit id citation at all), this milestone's
   `CandidateClaimSchema` would need to be revisited — not because this
   milestone's own logic would be wrong, but because its input contract
   would no longer match what a real generation step actually produces.
   This should be the first question Milestone 34's own design document
   answers, explicitly, before assuming this milestone's contract
   still holds.
3. **"Traceability" (citation resolution) is an acceptable, sufficient
   interim proxy for "non-fabrication," for the purposes of clearing
   this specific checkpoint** — not a claim that it is a complete or
   permanent solution. `ATLAS_AI_V2_FINAL.md` and this document both
   already name the semantic-truth gap explicitly (Section 12); this
   assumption is that closing the traceability gap first, honestly
   incomplete as it is, is still higher-leverage than doing nothing —
   consistent with the roadmap's own sequencing logic, but worth
   re-affirming explicitly rather than letting the word "verification"
   quietly imply more than this milestone delivers.
4. **A single, fail-closed `"matched"`/`"rejected"` verdict is
   sufficient for Milestone 34+'s needs**, i.e., that no future caller
   will need a graduated outcome (e.g., "partially traceable, review
   recommended") instead of a binary one. If a future milestone finds
   real cases where useful, mostly-traceable claims are being dropped
   entirely too often in practice, that would be a signal to revisit
   Section 7's fail-closed decision — not evidence that this milestone
   built the wrong thing, but a real, anticipated future design
   conversation this document flags in advance rather than pretending
   won't happen.

---

# 15. Verification Plan

**Local verification:** `tsc --noEmit`, `eslint`, `npm run
test:coverage` (the new schema and function must appear with real,
non-zero coverage — previously nonexistent, since neither file exists
yet), `next build` (confirming this purely-backend addition doesn't
regress the existing build in any way).

**Regression testing:** re-run the full existing suite (129 tests as of
Milestone 32's own count) to confirm zero existing test is broken —
none should be, since this milestone only adds new files and two
one-line barrel exports, but this is confirmed, not assumed.

**Manual verification:** none required beyond the automated suite —
this milestone has no UI, no route, and no real external caller yet,
so there is no golden path to click through. This is itself named
explicitly rather than silently omitted: unlike Milestones 29–32, this
milestone's "done" state is fully captured by its test suite alone.

**Edge cases, explicitly covered by the Acceptance Criteria themselves
(Section 13):** empty citation list, empty evidence pool, fully
unresolved citations, partially unresolved citations, duplicate
citations, citation order, and a structurally malformed candidate claim
— no case here is hypothetical; every one is named directly by the
roadmap's own Deliverables text or surfaced by this design's own
Architecture reasoning (Section 7).

---

# 16. Implementation Plan

Small enough that this milestone is not further broken into
sub-milestones — matching the roadmap's own framing of Milestone 33 as
a single, tightly-scoped Checkpoint A, not a phase of its own.

**Files, in build order:**
1. `lib/decision/schemas/candidateClaim.schema.ts` — the input
   contract, built first since the function and its tests both depend
   on it.
2. `lib/decision/traceability/claimVerifier.ts` — the function itself.
3. `lib/decision/traceability/claimVerifier.test.ts` — the full
   Acceptance Criteria test suite (Section 13), built immediately
   alongside the function, not after.
4. `lib/decision/traceability/index.ts`,
   `lib/decision/schemas/index.ts` (edit), `lib/decision/index.ts`
   (edit) — barrel wiring, last, once the implementation and tests are
   both green.

A single `tsc`/`eslint`/`vitest run` pass covers the whole milestone —
no intermediate gate is needed for a milestone this small, unlike
Milestone 32's three-sub-milestone structure.

---

# 17. Final Self Review

**Unnecessary complexity, directly challenged:** should this function
also validate that `Evidence.confidence` meets some minimum bar, since
it's already looking at the evidence object? Rejected — that's a
distinct, already-solved concern (`computeDecisionConfidence()`), and
folding it in here would blur "is this claim traceable" with "is this
evidence any good," two different questions with two different owners.

**Duplicated logic:** none found — `parseOrThrow` reused verbatim, the
`Map`-based lookup pattern is new but trivial (a single `Map`
construction, no framework), and the "first occurrence wins"
deduplication convention matches `dedupeByKey`'s own precedent rather
than inventing a second one.

**Over-engineering, directly challenged:** should this milestone also
build the batch-verification variant a real Milestone 34 caller will
likely eventually want (verify N claims at once, return a filtered
list)? Rejected — no real caller exists yet to specify what that API
should actually look like; building it now would be guessing at a
shape Milestone 34's own design is better positioned to specify.

**Under-engineering, directly challenged:** is returning a bare
`reason?: string` on rejection precise enough, or should rejection
reasons be a typed enum (`"no_evidence_cited" | "unresolved_id"`)
instead of free text? Considered seriously, given this milestone's own
"highest risk" framing — but no caller exists yet to consume this field
programmatically (Section 4, Non-Goals: no monitoring/logging system
this milestone). A human-readable string is sufficient for this
milestone's own test assertions and for whatever Milestone 34+ decides
to do with it; over-specifying a taxonomy now, before any real
consumer exists to inform it, would be exactly the premature structure
this project's engineering philosophy warns against.

**Maintenance burden:** one new, small, pure function and its schema —
proportionate to the fact that this is the single piece of logic every
future generation milestone's own safety depends on, and therefore the
piece most worth a thorough, permanent test suite rather than a thin
one.

**Architectural inconsistencies:** none found — this milestone
introduces zero new patterns (no new service, no new store, no new
test tier, no new folder shape) and repeats exactly the established
`lib/decision/` subfolder convention an eleventh time.

**What this design deliberately does not claim.** It does not claim
Atlas AI can now verify that a generated claim is *true*. It claims
exactly what's real and buildable today: a candidate claim's citations
either resolve to real evidence or they don't, checked by a pure,
fully-tested function with zero callers and zero LLM involvement —
narrower than "fabrication is now solved," stated plainly rather than
oversold, matching this project's consistent practice across every
design so far.

---

# 18. Principal Architect Review — Resolution Log

A full, independent review of this design was performed treating it as
another team's work — every technical claim re-verified directly
against the repository (confirming `lib/decision/traceability/` and
`candidateClaim.schema.ts` don't yet exist, re-reading `lib/verification/`'s
actual behavior, and re-running the "zero other callers" grep by hand
rather than trusting the design's own prior wording). Findings and
resolutions:

| # | Category | Finding | Resolution |
|---|---|---|---|
| 1 | Architectural consistency | Section 6's "intended future flow" implied a caller could go directly from a validated `CandidateClaim` plus this function's `resolvedEvidence` to `buildFinding()`/`buildRiskFinding()`, but those constructors require `category`/`severity`/`confidence` — none of which `CandidateClaimSchema` carries. The narrative overstated what this contract hands off. | Section 6 rewritten to state explicitly that `CandidateClaim` is only the traceability contract (`summary` + `citedEvidenceIds`), not a complete candidate finding; `category`/`severity`/`confidence` are named explicitly as belonging to a separate, not-yet-designed Milestone 34 shape. The same clarification added directly under Deliverable 1 (Section 3), so the scope boundary is visible at the point the schema is introduced, not only in the later flow narrative. |
| 2 | Acceptance criteria wording | AC9's title, "Order independence," described the opposite of the property it tests (order preservation/dependence, not independence). | Retitled to "Order preservation" (Section 13), with a note explaining the correction. |
| 3 | Audit precision | Section 5.2 claimed "zero other callers... confirmed by grep" for `buildFinding()`/`buildRiskFinding()`, but a literal grep for those names returns hits from coincidentally-named local test-fixture helpers in `dueDiligenceReport.test.ts`/`executiveSummary.test.ts` — not real callers. The claim was true in substance but imprecisely supported. | Section 5.2 reworded to name the local-helper hits explicitly, explain why they don't count as real callers, and note that this distinction was confirmed by reading each hit's context, not by trusting the grep match alone. |
| 4 | Missing specification | No stated policy on case-sensitivity, trimming, or fuzzy matching for evidence-id comparison, despite the eventual citation source (an LLM's structured output) being a realistic source of minor formatting drift. | Added a new Architecture subsection (Section 7): comparison is exact string equality, case-sensitive, no trimming, fail-closed on any mismatch — justified against this milestone's own zero-tolerance philosophy, and noted as already true by construction (`Map.prototype.get`'s native string equality) with nothing further to build. |
| 5 | Interface design (optional) | `verifyClaimTraceability()` accepts the full `CandidateClaim` but only reads `citedEvidenceIds`; `claim.summary` passes through unused with no stated rationale. | Addressed with a short, explicit rationale added to Section 7: taking the whole claim object preserves the function's own conceptual framing ("is this claim traceable") and leaves room for a future, still-narrow refinement without a signature change — an accepted, deliberate trade-off, not an oversight. |

**Explicitly confirmed, no change needed:**
- **Core algorithm correctness**: the fail-closed-on-any-unresolved-id
  decision, the first-occurrence-wins deduplication convention, and the
  `Map`-based lookup implementation in Section 7 were all re-traced by
  hand against the Acceptance Criteria in Section 13 — no logic error
  found.
- **A property confirmed positive, not previously stated**: a
  `"matched"` result's `resolvedEvidence` is always non-empty by
  construction (an empty-citation claim is rejected before any lookup
  runs), which means it already satisfies `RiskFindingSchema`'s own
  `.min(1)` evidence requirement without this design needing to enforce
  that separately — verified by re-tracing the logic, not asserted.
- **Scope boundary**: re-confirmed that no finding from this review
  requires wiring this function into `deriveFindings()`/
  `deriveCriticalRisks()`/`buildInvestmentThesis()`, expanding into
  batch verification, or touching `lib/verification/` — every fix above
  is a clarification or precision correction within this milestone's
  already-approved scope, not a scope change.

No finding in this review reopened the milestone's scope boundary,
proposed new implementation, or touched `ATLAS_AI_V2_FINAL.md`/
`ATLAS_AI_V2_ROADMAP.md`.

---

*End of design specification. Awaiting Principal Architect Review
before any implementation begins. No code has been written, no file
modified.*
