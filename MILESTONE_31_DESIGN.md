# Atlas AI — Milestone 31 Design Specification

**Intelligence & Decision Engine — Reaching the Orphaned Decision Artifacts**

Status: **Design only. No code, no folders, no source files modified.
No commits.**

---

# 1. Goal

**Purpose.** Make three fully-built, already-tested-worthy Decision
Intelligence artifacts — Executive Summary, Investment Memo, and Due
Diligence Report — actually reachable by a signed-in founder viewing
their own project, for the first time. Every one of these artifacts
has existed as a pure, schema-validated, unit-testable function in
`lib/decision/` since Milestone 10. None has ever had a caller.
`DECISION_PLATFORM.md`'s own status line has said, unchanged, since
before this project's Authentication existed: **"Status: not wired
into the application."** Milestone 31 is the milestone that makes that
line false — and only that line. No new decision-computation logic is
introduced anywhere in this design.

**Why this is not a new "engine."** The audit below (Section 5)
establishes, with direct evidence, that Atlas AI already has a real,
mature Intelligence & Decision Engine — `lib/decision/`, sitting on
top of five knowledge platforms, already live in production via
`lib/pipeline/stages/decision.ts` on every single analysis a founder
runs today. The user's own framing ("integrates with the existing
six-platform pipeline without duplicating logic") is interpreted
literally and audited before being interpreted architecturally: this
milestone does not build a second decision engine beside the first
one. It builds the thin, final, missing layer between an engine that
already exists and a founder who has never been able to see three of
its outputs.

**Why this is the correct sequencing after Milestone 30.** Milestone
30 built this project's first real test harness and a proven
three-tier pattern (pure function → mocked service → integration),
plus a fixture (`buildDecisionProfileFixture`) purpose-built to
construct a complete, schema-valid `DecisionProfile` — precisely the
one input every function this milestone wires already takes. Milestone
31 is the first opportunity to spend that investment on something
real: `buildExecutiveSummary`/`buildInvestmentMemo`/
`buildDueDiligenceReport` have **never had a single automated test**
(their only prior verification was a temporary scratch route, exercised
once, then deleted — `DECISION_PLATFORM.md`'s own "Runtime
Verification" section). This milestone both wires and, for the first
time, permanently tests them.

**Fit with long-term architecture.** `CLAUDE.md` Section 22 names the
services layer as "the stable contract" and schema evolution as
strictly additive. This milestone touches neither — it adds zero new
schemas, zero new persisted state, and reuses `getProjectById`
(Milestone 29) unmodified for every ownership check. It is the same
"surface what's already built and correct" shape as Milestones 16–19
(closing the knowledge-platform-to-`DecisionProfile` gap) and
Milestone 29 (closing UI-reachability gaps) — applied one layer
further downstream, to `DecisionProfile`-to-artifact.

---

# 2. Scope

### Included

- Three new, protected, per-project routes rendering the three
  already-built artifacts (`buildExecutiveSummary`,
  `buildInvestmentMemo`, `buildDueDiligenceReport`), reusing
  Milestone 29's exact ownership pattern.
- Three new presentational components rendering each artifact,
  explicitly surfacing the evidence trail behind every finding/risk/
  claim (the "explainability" requirement), built entirely from
  existing shared primitives.
- A small navigation addition to the existing `/projects/[id]` page
  linking to the three new views.
- Permanent unit tests for `buildExecutiveSummary`,
  `buildInvestmentMemo`, and `buildDueDiligenceReport` — their first
  ever automated tests — using Milestone 30's fixture and three-tier
  testing pattern.

### Excluded (see Non-Goals, Section 4)

- Any form of recommendation, thesis, finding, or red-flag
  **generation**. `buildRecommendation()`, `deriveEmptyThesis()`,
  `deriveFindings()`, `deriveCriticalRisks()` remain exactly as
  honestly-empty/architecture-only as they are today.
- The four other named future consumers in `DECISION_PLATFORM.md`'s
  own "Future Consumers" list (Funding Readiness, Acquisition Review,
  Bank Lending Assessment, Accelerator Evaluation) — none has a
  builder function yet; none is reachable this milestone.
- Real readiness assessment, real Supabase-backed
  `DecisionKnowledgeStore`, PDF/export generation, or any new
  dependency.
- Any change to `synthesizeDecision()`, `buildDecisionProfile()`,
  `mergeDecisionProfile()`, or any of the five knowledge platforms.

**Feature-creep guard:** every deliverable below either (a) reuses an
existing, unmodified pure function verbatim, or (b) is a new,
purely-presentational route/component with zero decision logic of its
own. If a deliverable would require deciding *what* to recommend,
conclude, or assess — rather than *how to reach and display* something
already computed — it does not belong in this milestone.

---

# 3. Deliverables

1. **`app/projects/[id]/executive-summary/page.tsx`** — Server
   Component. `getCurrentUser()` + redirect (Milestone 29 pattern),
   `getProjectById(id, user.id)` + `notFound()`, then
   `buildExecutiveSummary(project.profile)` called directly — no new
   service file (Section 7 explains why one isn't needed). Renders
   `<ExecutiveSummaryView summary={...} />`.
2. **`app/projects/[id]/memo/page.tsx`** — same pattern, calls
   `buildInvestmentMemo(project.profile)` (recommendations argument
   omitted — defaults to `[]`, honestly, since nothing in this
   codebase generates one yet). Renders `<InvestmentMemoView
   memo={...} />`.
3. **`app/projects/[id]/diligence/page.tsx`** — same pattern, calls
   `buildDueDiligenceReport(project.profile)`. Renders
   `<DueDiligenceReportView report={...} />`.
4. **`components/workspace/decision-report/ExecutiveSummaryView.tsx`**
   — `decisionContext`/`businessSummary` header, `topStrengths`/
   `topWeaknesses` (`StringList`), `topFindings` with severity badges
   and each finding's own `EvidenceList`, `criticalRiskCount` as a
   `StatCell`, `confidenceSummary` reusing `TrustPanel`'s existing
   confidence-rendering pattern. Props are the real, inferred
   `ExecutiveSummary` type (`lib/decision`), never redefined. **Not a
   duplicate of `DecisionSummaryPanel`**: that component renders
   `DecisionProfile`'s full, unsliced strengths/weaknesses/findings —
   this one renders `ExecutiveSummary`'s own top-N *selection* of the
   same underlying facts, for a reader who wants a scannable summary,
   not the full dashboard. Two different consumption needs over
   overlapping data, not two views of the same thing.
5. **`components/workspace/decision-report/InvestmentMemoView.tsx`**
   — the fullest artifact: `decisionContext`/`businessSummary`,
   `investmentThesis` (positive/negative arguments, unknowns,
   contradictions — same fields `DecisionSummaryPanel` already
   renders, in memo layout), `keyFindings`/`criticalRisks` each with
   `EvidenceList`, `recommendations` (honest `EmptyState` — see
   Section 4's "Recommendation generation" Non-Goal for why it's
   empty, not a broken feature), `decisionReadiness`,
   `confidenceSummary`. Props are the real, inferred `InvestmentMemo`
   type, never redefined. **One genuinely new bit of presentation,
   named honestly rather than folded silently into "existing
   primitives"**: `decisionReadiness`'s five `ReadinessAssessment`
   dimensions (`{ level?, rationale? }`) have never been rendered by
   any component in this codebase — confirmed by direct read of
   `DecisionSummaryPanel.tsx`, which renders every other
   `DecisionProfile` field except this one. This view adds one small,
   local (not shared/promoted — used exactly once, below the "three
   repetitions" threshold, Section 5.3) list of the five dimensions,
   each showing its `rationale` or an honest "Not yet assessed" label
   when `level` is absent — the realistic case today, since
   `deriveDecisionReadiness()` leaves every level unset (Non-Goals).
6. **`components/workspace/decision-report/DueDiligenceReportView.tsx`**
   — the eight named sections (`business`/`market`/`competition`/
   `financial`/`operations`/`technology`/`legal`/`execution`), each an
   honest `EmptyState` when its `findings` array is empty (a category
   with zero categorized findings is a real, expected state — Finding
   objects don't exist yet at all in this environment without
   real search-provider credentials), plus the cross-cutting
   `evidence` and `unknowns` sections.
7. **`components/workspace/decision-report/DecisionArtifactLinks.tsx`**
   — a small link row (three `Button`+`Link`, matching the existing
   `render={<Link .../>}` pattern) added to
   `app/projects/[id]/page.tsx`, above or alongside `DecisionReport`.
8. **Unit tests** (co-located, per `CLAUDE.md`'s Milestone 30 Folder
   Rule): `lib/decision/executive/executiveSummary.test.ts`,
   `lib/decision/memo/investmentMemo.test.ts`,
   `lib/decision/diligence/dueDiligenceReport.test.ts` — each built
   against `tests/fixtures/buildDecisionProfileFixture` (Milestone 30),
   with `profileOverrides` constructing the specific findings/
   strengths/severities each test needs. The first automated tests
   these three functions have ever had.
9. **`DECISION_PLATFORM.md` update** (mislabeled as a `CLAUDE.md`
   update in an earlier draft of this section, corrected here — the
   platform's own architecture doc is the one that needs to change,
   not the handbook): its own "Status: not wired into the application"
   line, and the "Future Consumers" table, updated to reflect Executive
   Summary/Investment Memo/Due Diligence as delivered, Milestone 31
   named as the point they were wired — the same "documentation
   reflects reality" discipline every prior milestone in this project
   has followed. `CLAUDE.md` itself needs no change: its own Roadmap
   (Section 21) only tracks the original seven foundational milestones
   and was never extended to name Decision Intelligence (Milestone 10)
   as a numbered entry, so there is nothing there for this milestone to
   correct.

Nothing else changes.

---

# 4. Non-Goals

- **Recommendation generation.** `lib/business/recommendations/
  recommendationBuilder.ts`'s `buildRecommendation()` is, by its own
  doc comment, "ARCHITECTURE ONLY... it does not decide *what* to
  recommend." No logic reading a `BusinessProfile`/`BusinessScore` and
  producing real `Recommendation[]` is added. `InvestmentMemoView`
  shows an honest "No recommendations yet" state, not a fabricated one
  — matching this codebase's absolute rule against invented content.
- **Thesis/finding/red-flag generation.** `DECISION_PLATFORM.md`'s own
  "Also on the roadmap" section names this explicitly as "likely
  AI-assisted" future work, structurally separate from this milestone.
- **Real readiness assessment.** `deriveDecisionReadiness()` remains
  honestly unassessed on all five dimensions.
- **The four other named future consumers** (Funding Readiness,
  Acquisition Review, Bank Lending Assessment, Accelerator
  Evaluation) — no builder function exists for any of them yet.
- **A Supabase-backed `DecisionKnowledgeStore`.** Not needed — the
  `DecisionProfile` these three functions consume is already fully
  persisted inside `Project.profile` (Milestone 26); this milestone
  reads it exactly the way `DecisionReport` already does.
- **PDF/print/export generation.** No new dependency. `window.print()`
  or a print stylesheet is a reasonable, cheap future addition, not
  required to make these artifacts *reachable*, which is this
  milestone's entire mandate.
- **A JSON API endpoint for these artifacts.** No current consumer
  needs one (Server Components read the service layer directly, per
  `CLAUDE.md`'s own architecture). Not built for a hypothetical future
  integration.
- **Technical Debt #1** (the small `dedupeByKey`/`urlDedupeKey`
  duplication `ARCHITECTURE_REVIEW.md` and `DECISION_PLATFORM.md` both
  name) — a separate, independent, already-scoped-elsewhere debt item,
  not touched here.

---

# 5. Current State Audit

Every claim below is from a direct read this session, not memory.

## 5.1 Existing Intelligence Components — full inventory

Six platforms, each with its own `knowledge/` (or `engine/`)
orchestration folder, `schemas/`, `storage/` (memory-backed by
default, confirmed Milestone 30), `refresh/` policy, and public
barrel:

| Platform | Folder | Synthesis entry point | Status |
|---|---|---|---|
| Research | `lib/research/` | `runResearch()` | Live, offline-honest (no configured providers in this environment) |
| Competitors | `lib/competitors/` | `discoverCompetitors()`, `resolveCompetitorKnowledge()` | Live, wired |
| Market | `lib/market/` | `discoverMarket()`, `resolveMarketKnowledge()` | Live, wired |
| Financial | `lib/financial/` | `discoverFinancials()` | Live, wired |
| Business | `lib/business/` | `discoverBusiness()` | Live, wired |
| **Decision** | `lib/decision/` | `synthesizeDecision()` | **Live, wired for `DecisionProfile` synthesis — NOT wired for its three downstream artifacts** |

`lib/pipeline/engine/pipelineEngine.ts`'s `runOneStage()` dispatches
`decisionStage` as the sixth and final stage of every real analysis
(confirmed by direct read) — `DecisionProfile` construction is fully
live, on every session, today. This audit's one material finding is
entirely below this line, inside `lib/decision/` itself.

**`lib/decision/`'s own sixteen folders** (confirmed via
`DECISION_PLATFORM.md`, cross-checked against the actual directory
listing):

```
engine/          synthesizeDecision(), buildDecisionProfile(), mergeDecisionProfile()  — LIVE
confidence/       computeDecisionConfidence()                                          — LIVE, unit-tested (Milestone 30)
evidence/         aggregateEvidence()                                                  — LIVE
thesis/           deriveEmptyThesis() (honest-empty); buildInvestmentThesis() unused    — architecture only
findings/         deriveFindings() → [] (honest-empty); buildFinding() unused           — architecture only
redflags/         deriveCriticalRisks() → [] (honest-empty)                            — architecture only
readiness/        deriveDecisionReadiness() (all 5 dimensions unassessed)              — architecture only
recommendations/  aggregateRecommendations()/sortRecommendationsByPriority()            — built, nothing to aggregate yet
memo/             buildInvestmentMemo(profile, recommendations?) → InvestmentMemo       — built, ZERO CALLERS
diligence/        buildDueDiligenceReport(profile) → DueDiligenceReport                 — built, ZERO CALLERS
executive/        buildExecutiveSummary(profile, maxItems?) → ExecutiveSummary          — built, ZERO CALLERS
refresh/          buildDecisionRefreshMetadata(), collectStaleDecisions()               — live (used by engine/)
storage/          MemoryDecisionStore (real); Supabase/Postgres/Warehouse (honestly throw) — unused (Project persistence covers the real need)
schemas/          one Zod schema per shape — source of truth
types/            DecisionKnowledgeStore contract, CoverageChecklist
utils/            dedupeByKey, urlDedupeKey (Technical Debt #1, unrelated to this milestone)
```

**Confirmed via direct grep** (`app/`, `components/`, `hooks/`,
`lib/services/`, `lib/pipeline/`, `lib/analysis-session/`): zero
matches for `buildInvestmentMemo`, `buildDueDiligenceReport`,
`buildExecutiveSummary`, `aggregateRecommendations`, or
`buildRecommendation` anywhere outside `lib/decision/`/
`lib/business/` themselves. `DECISION_PLATFORM.md`'s "Status: not
wired into the application" is still, today, literally true for these
three functions — unchanged since Milestone 10.

## 5.2 Decision-related data structures — full inventory

Already-defined, already schema-valid, all reused verbatim by this
design, none redefined:

- **`DecisionProfile`** (`lib/decision/schemas/decision.schema.ts`) —
  the central record: `decisionContext`, `businessSummary`,
  `investmentThesis`, `keyFindings: Finding[]`,
  `strengths`/`weaknesses`/`opportunities`/`threats`,
  `criticalRisks: RiskFinding[]`, `keyCompetitors: CompanyProfile[]`,
  `marketProfile`, `financialProfile`, `businessProfile`,
  `sources`/`evidence`, `confidenceSummary`, `openQuestions`,
  `decisionReadiness`, `decisionLimitations`, `refresh`. Already fully
  persisted as `Project.profile` (Milestone 26) — this milestone's one
  and only input.
- **`ExecutiveSummary`** — `decisionContext`, `businessSummary`,
  `topStrengths`/`topWeaknesses` (sliced), `topFindings` (severity-
  sorted, sliced), `criticalRiskCount`, `confidenceSummary`,
  `generatedAt`.
- **`InvestmentMemo`** — `decisionContext`, `businessSummary`,
  `investmentThesis`, `keyFindings`, `criticalRisks`,
  `recommendations: Recommendation[]` (reused from `lib/business`,
  defaults `[]`), `decisionReadiness`, `confidenceSummary`,
  `generatedAt`.
- **`DueDiligenceReport`** — eight named `DiligenceSection`s
  (`{ summary?, findings: Finding[] }`), plus cross-cutting
  `evidence: Evidence[]` and `unknowns: string[]`, `generatedAt`.
- **`Finding`** — `id`, `category`, `severity` (three-level, reused
  from `lib/market`'s `Severity`), `summary`, `evidence: Evidence[]`
  (may legitimately be empty), `confidence`.
- **`RiskFinding`** — same shape, four-level `RedFlagSeverity`
  (adds `critical`), and **structurally requires** `evidence.length
  >= 1` — a red flag can never be unsupported, enforced by the schema
  itself, not just documented.
- **`Recommendation`** (`lib/business/schemas/recommendation.schema.ts`)
  — `id`, `category`, `priority`, `reason`, `requiredEvidence`,
  `confidence`. Its own constructor (`buildRecommendation`) is,
  verbatim, "ARCHITECTURE ONLY... ​A future milestone's generation
  logic... calls this constructor for each one it produces." No such
  generation logic exists anywhere in this codebase today.
- **`VerificationSummary`**/`VerifiedClaim` (`lib/verification/`) —
  already rendered by `TrustPanel`; not consumed by the three new
  artifacts directly (they read `DecisionProfile` fields, which is
  where `confidenceSummary` already lives — no duplicate confidence
  computation needed).

## 5.3 Reuse opportunities — what this design must not reimplement

- **`getProjectById(id, userId)`** (`lib/services/projects.ts`,
  Milestone 29, unit-tested Milestone 30) — the exact ownership check
  every new route needs. Already proven enumeration-resistant.
- **`getCurrentUser()` + redirect** — the exact auth pattern
  `app/projects/[id]/page.tsx` already uses.
- **`app/projects/error.tsx`** (Milestone 29) — Next.js error
  boundaries wrap all nested child segments automatically; a new
  `app/projects/[id]/memo/error.tsx` is **not needed** — `/projects/
  [id]/memo`, `/executive-summary`, `/diligence` are already covered
  by the existing boundary one level up. Explicitly verified against
  Next.js's own documented error-boundary nesting behavior (checked
  during Milestone 29).
- **Shared UI primitives**: `SectionHeader`, `IconBadge`, `EmptyState`,
  `StringList`, `EvidenceList`, `StatCell`, `Badge`,
  `severityBadgeVariant` — every one of these already exists and
  already renders exactly the field shapes (`Finding[]`,
  `Evidence[]`, severity strings) these three new artifacts carry.
  Zero new shared components are required at the primitive level —
  only new, feature-specific composition components (Deliverables
  4–6), consistent with `components/shared/`'s own "three repetitions"
  promotion rule not being met by anything new here.
- **`Button` + `render={<Link .../>}`** — the exact composition
  pattern `DecisionArtifactLinks` reuses, already used four times in
  this codebase (`RecentProjectsPanel`, `DashboardWelcome`,
  `ProfileMenu`, `Navbar` as of Milestone 29).
- **`tests/fixtures/buildDecisionProfileFixture`** (Milestone 30) —
  already builds a complete, schema-valid `DecisionProfile` by
  composing the real platform builders. This milestone's unit tests
  need only `profileOverrides` (already a supported parameter) to
  construct specific findings/severities/strengths per test case —
  zero new fixture infrastructure required.
- **The three-tier testing pattern** (pure/mocked/integration,
  Milestone 30) — every new test this milestone adds is Tier 1 (pure
  function, no mocking) — the cheapest, fastest tier, already fully
  proven.

## 5.4 Architectural constraints

- **`CLAUDE.md` Section 3's six-layer architecture** still applies in
  full: routes stay thin, business logic (here: none new) belongs in
  services or, for pure reshaping with no external I/O, may be called
  directly from a Server Component — the same pattern `app/projects/
  [id]/page.tsx` already establishes by calling `<DecisionReport
  profile={...} />` without an intervening service wrapper. Section 7
  justifies why this milestone follows that precedent rather than
  adding a needless service file.
- **`DECISION_PLATFORM.md`'s own binding rule**: "Decision Intelligence
  is a synthesis layer. It orchestrates and synthesizes only — it must
  never perform research, discover competitors, classify markets,
  estimate financial metrics, derive business strategy, or duplicate
  any lower layer's logic." This milestone sits **below** even that —
  it doesn't touch synthesis at all, only presentation of
  already-synthesized output — so the same discipline applies with
  even less room for drift.
- **"Never fabricate data"** (`CLAUDE.md` Section 1, restated
  throughout every knowledge platform's own docs) — the single most
  load-bearing constraint on this design. An empty `recommendations`
  array must render as an honest "not yet available" state, never a
  placeholder recommendation; an empty `DiligenceSection` must render
  as "no findings in this category yet," never a fabricated one.
- **No LLM usage anywhere in the six platforms today** (confirmed
  across this session's audits) — `buildExecutiveSummary`/
  `buildInvestmentMemo`/`buildDueDiligenceReport` are 100%
  deterministic, and this milestone keeps them that way. Nothing here
  calls `lib/services/openai.ts`.
- **Storage defaults to in-memory everywhere except `projects`**
  (Milestone 30's own structural finding) — reinforces that no new
  `DecisionKnowledgeStore` backend work is needed; `Project.profile`
  is this design's only real data source.
- **RLS + application-layer ownership, both required** (Milestone
  27c/29) — every new route must apply both layers, automatically
  satisfied by reusing `getProjectById` unmodified.
- **Server Components can't be integration-tested with today's tooling**
  — a genuine, newly-surfaced constraint (Section 7/Verification Plan):
  Milestone 30's integration-test pattern calls a route handler
  (`route.ts`) as a plain async function; a Server Component `page.tsx`
  involves React rendering, which the current Vitest setup
  (deliberately, per Milestone 30's own Non-Goals) has no
  Testing-Library/jsdom support for. This milestone's test coverage is
  therefore Tier 1 only (the pure `build*` functions) — the routes
  themselves are verified by manual/golden-path testing, not
  automated, an honest limitation named here rather than glossed over.

---

# 6. User Flows

### Founder views their Executive Summary

1. From `/projects/{id}`, clicks "Executive Summary" (`DecisionArtifactLinks`).
2. `/projects/{id}/executive-summary` — ownership verified, `notFound()`
   if not theirs or nonexistent (identical to `/projects/{id}` itself).
3. Sees top strengths/weaknesses, the highest-severity findings (each
   with its evidence trail), a critical-risk count, and the same
   confidence figures already shown elsewhere in the app.

### Founder views their Investment Memo

1. Same navigation/ownership pattern, at `/projects/{id}/memo`.
2. Sees the full investment thesis (positive/negative arguments,
   unknowns, contradictions), findings, critical risks, decision
   readiness, confidence — and an honest "No recommendations yet"
   state, not a fabricated recommendation.

### Founder views their Due Diligence Report

1. Same pattern, at `/projects/{id}/diligence`.
2. Sees all eight domain sections; any section with zero categorized
   findings shows an honest empty state; the cross-cutting Evidence and
   Unknowns sections at the bottom.

### Edge case — a project with no findings/risks/evidence at all

(The realistic case in this environment, with no search-provider
credentials configured.) Every new view renders entirely via honest
empty states — no artifact ever looks broken or partially-loaded; it
looks exactly as complete as the data underneath it honestly is,
matching every existing card's own established convention.

### Edge case — anonymous or wrong-owner visitor

Identical to `/projects/{id}` today: signed-out → redirect to
`/login?redirectTo=...`; wrong owner or nonexistent id → `notFound()`,
indistinguishably (the same enumeration-resistance guarantee Milestone
29 established and Milestone 30 unit-tested, inherited automatically
since `getProjectById` is reused unmodified).

### Edge case — a Server Component render error

Caught by the existing `app/projects/error.tsx` boundary (Milestone
29) — no new boundary needed, confirmed by Next.js's own nested-segment
inheritance behavior.

---

# 7. Architecture

### Why no new `lib/services/` file — corrected during Principal
Architect review, same conclusion, different (real) justification

An earlier draft of this section justified skipping a service file by
citing `app/projects/[id]/page.tsx` as precedent for "a Server
Component calling directly into `lib/decision`'s public barrel." On
re-verification, that precedent doesn't hold: that page passes an
**already-built** `project.profile` straight through as a prop
(`<DecisionReport profile={project.profile} />`) — it never invokes a
`lib/decision` function itself. There is, in fact, no existing
precedent in this codebase for a route calling a knowledge-platform
function directly; every current app-facing consumer of the six
platforms goes through a `lib/services/*.ts` file
(`analysisSessions.ts` → `lib/analysis-session` → `lib/pipeline` →
`lib/decision`). Citing a precedent that doesn't exist was a real
error, corrected here.

The conclusion (no new service file) still holds, but on its own
merits, examined directly rather than assumed: every *existing*
`lib/services/` function earns its place by doing something beyond
calling straight into a platform function — `getProjectById`/
`listProjects` talk to Supabase and map snake_case rows;
`startAnalysisSession` also triggers `persistProjectFromSession`, a
real cross-cutting concern beyond the pure synthesis call. A
hypothetical `getExecutiveSummary(profile) { return
buildExecutiveSummary(profile); }` would do none of that — it would
be a bare rename with zero added behavior, exactly the "unnecessary
abstraction" `CLAUDE.md`'s Engineering Philosophy (Section 2) warns
against, and would cost a reader an extra file to open only to find
nothing there. The real, correct precedent for calling a pure,
deterministic function directly from a Server Component is the one
already established everywhere in this codebase for formatters
(`formatRelativeTime`, `severityBadgeVariant`, etc.) — called inline,
never behind a service, because they have no I/O and no cross-cutting
concern to own. `buildExecutiveSummary`/`buildInvestmentMemo`/
`buildDueDiligenceReport` are in that same category: pure, zero-I/O,
single-purpose. If a future artifact's construction ever needs real
I/O (e.g., a persisted `DecisionKnowledgeStore` read, or a
cross-cutting concern like triggering a refresh), *that* function
would earn a service wrapper on its own merits, at that time — not
preemptively, for three functions that don't need one today.

### Route structure

```
app/projects/[id]/
  page.tsx                    (existing, Milestone 29 — gains DecisionArtifactLinks)
  error.tsx                   (existing, Milestone 29 — inherited by all three below)
  executive-summary/
    page.tsx                  (new)
  memo/
    page.tsx                  (new)
  diligence/
    page.tsx                  (new)
```

Each new `page.tsx` follows the identical, three-line shape:

```ts
const user = await getCurrentUser();
if (!user) redirect(`/login?redirectTo=${encodeURIComponent(...)}`);
const project = await getProjectById(id, user.id);
if (!project) notFound();
const summary = buildExecutiveSummary(project.profile);
return <ExecutiveSummaryView summary={summary} />;
```

### Component architecture

Three new, single-responsibility presentational components
(`components/workspace/decision-report/*View.tsx`), each taking one
already-validated artifact object (the real, inferred `ExecutiveSummary`/
`InvestmentMemo`/`DueDiligenceReport` types, never redefined) as its
only prop — no fetching, no business logic, matching `CLAUDE.md`'s UI
Layer rule exactly. Built almost entirely from existing shared
primitives (Section 5.3), with one honest exception: `InvestmentMemoView`
adds a small, new, non-promoted treatment for `decisionReadiness`'s
five dimensions, which no existing component renders (Deliverable 5).
No new item is promoted to `components/shared/` — the readiness
treatment is used exactly once, below the "three repetitions"
threshold that would justify promotion (Section 5.3).

### Explainability — a concrete, structural requirement, not a slogan

Every `Finding`/`RiskFinding` rendered by any of the three new views
must be accompanied by its own `EvidenceList` (already built,
Milestone 24), not just its summary/severity badge. This is not
optional polish: `RiskFindingSchema` *structurally guarantees* every
risk has at least one evidence entry (`evidence.length >= 1`,
enforced by the schema itself) — a UI that showed a risk without its
evidence would be hiding a guarantee the data model already makes.
Ordinary `Finding`s may have empty evidence (an honest, allowed state,
distinct from `VerifiedClaim`'s own stricter "verified" filter in
`lib/verification`) — rendered as "no supporting evidence recorded,"
never suppressed or implied to be evidenced when it isn't.

### Extensibility — the seam for a future fourth/fifth artifact

`DECISION_PLATFORM.md`'s own "Future Consumers" list names four more
products (Funding Readiness, Acquisition Review, Bank Lending
Assessment, Accelerator Evaluation) with no builder function yet. This
milestone's route/component pattern — one route, one presentational
component, one already-built `build*(profile)` call — is the exact
shape a future artifact would repeat once its own builder function
exists: add `app/projects/[id]/<new-artifact>/page.tsx` plus
`<NewArtifactView>`, nothing else. No redesign, no new abstraction
layer to retrofit. Named explicitly here so the next engineer sees the
pattern is deliberate, not incidental.

### Testability — what is and isn't covered, honestly

Tier 1 (pure function) tests cover 100% of the actual decision logic
this milestone touches — the three `build*` functions, using
`buildDecisionProfileFixture`'s `profileOverrides` to construct
specific severities/categories/counts per test case. The three new
routes themselves are **not** automated-test-covered — Server
Component rendering isn't reachable by this project's current test
tooling (Milestone 30 deliberately excluded Testing Library/jsdom as a
Non-Goal; this milestone doesn't reopen that decision). This gap is
named plainly in Section 5.4/12/16, not hidden — the routes are
three-line, low-risk, and manually verified per this project's
existing Definition of Done, the same standard every prior route
(including the four in Milestone 29) shipped under before Milestone 30
introduced automated testing at all.

---

# 8. Data Model

**No database changes.** No new table, column, index, or RLS policy.
No migration file. The one input every new route reads
(`Project.profile: DecisionProfile`) is already fully persisted by
Milestone 26 and already read by the existing `/projects/{id}` route
via the unmodified `getProjectById`. Nothing new is written anywhere.

---

# 9. API Contract

**No new or changed API route.** All three new surfaces are Server
Components reading directly via existing services, exactly like
`/projects/[id]` itself — consistent with `CLAUDE.md`'s own
architecture (a page calls a service/pure function for a read only its
own render needs; it doesn't need a JSON endpoint nobody consumes).

---

# 10. Security Review

- **Authentication/authorization**: identical to `/projects/[id]` —
  `getCurrentUser()` + `getProjectById(id, userId)`, reused unmodified.
  No new authorization logic is written, so no new authorization bug
  can be introduced; the existing, Milestone-30-unit-tested guarantee
  (a nonexistent id and a wrong-owner id are indistinguishable, both
  `null`/`notFound()`) applies automatically to all three new routes.
- **No new data exposure surface.** Every field these three artifacts
  render was already reachable by the same signed-in owner via the
  existing `/projects/[id]` → `DecisionReport` → `DecisionSummaryPanel`
  chain (Section 5, confirmed by direct read: `investmentThesis`,
  `keyFindings`, `criticalRisks`, SWOT are already fully rendered
  there). This milestone reshapes *presentation*, not *access* — no
  founder sees a single new fact about their own project they couldn't
  already see.
- **No new abuse surface.** Three new GET-only Server Component routes,
  no new mutation, no new external call, no new input parsed beyond the
  existing `id` path param `/projects/[id]` already validates the same
  way.

---

# 11. Performance Review

- **Computational cost:** each of the three `build*` functions is a
  synchronous, in-memory reshape/selection over data already fully
  loaded for the existing `/projects/[id]` route — negligible
  (confirmed by direct read: array `.slice()`/`.filter()`/`.sort()`
  over already-small, single-project-scoped lists; no loop over more
  than a few dozen items in any realistic case).
- **Database cost:** one additional `getProjectById` call per new route
  visited — the exact same, already-indexed, already-measured-cheap
  query `/projects/[id]` itself makes (Milestone 29's own Performance
  Review: "one additional, indexed query — negligible").
- **No new caching need.** Nothing here is expensive enough to justify
  it, per `CLAUDE.md`'s "measure before optimizing" rule.

---

# 12. Risks

- **Silent scope pressure toward generation.** The single largest risk
  to this design's own boundary: once a founder sees an "Investment
  Memo" with an empty recommendations section, the natural next
  request is "now generate real recommendations." Mitigated by naming
  this explicitly, twice (Non-Goals, Section 5.4), as a structurally
  separate, much larger, likely-AI-assisted future milestone — not
  something this design's own success should be allowed to quietly
  absorb.
- **Untested routes.** Named honestly in Section 7/5.4 — the three new
  `page.tsx` files are not automated-test-covered, a real, accepted gap
  matching this project's pre-Milestone-30 baseline for every other
  route, not a regression introduced by this design.
- **Empty-state fatigue.** Three new views, in this credential-less
  environment, will mostly show honest empty states — a real risk that
  this milestone could *feel* like it delivered little of visible
  value. Mitigated by being explicit (here, and in the artifacts'
  own copy) that the emptiness is a correct reflection of this
  environment's actual data, not a bug — the exact same framing
  `CompetitorIntelligenceCard`'s own empty state already uses.
- **Rollback.** Fully additive — three new routes, three new
  components, one new link component, new test files, a documentation
  update. Reverting the commit removes all of it with zero effect on
  any existing route or persisted data.

---

# 13. Acceptance Criteria

1. [ ] `/projects/{id}/executive-summary`, `/memo`, `/diligence` each
   render for the owning, signed-in user.
2. [ ] Each route redirects signed-out visitors to `/login`, and
   returns `notFound()` identically for a nonexistent id and a
   different owner's id (verified as the same collapsed case, not
   assumed — matching Milestone 30's own honest AC6 correction).
3. [ ] Every rendered `Finding`/`RiskFinding` *object* shows its own
   `EvidenceList`; a `Finding` with empty evidence renders an honest
   "no evidence recorded" state, never omitted or implied evidenced.
   Scoped precisely: `ExecutiveSummary.criticalRiskCount` is a bare
   `number` by its own schema (no `RiskFinding[]` reaches
   `ExecutiveSummaryView` at all) — there is no per-item evidence to
   attach there, and this criterion does not apply to it. It applies in
   full to `ExecutiveSummaryView.topFindings`,
   `InvestmentMemoView.keyFindings`/`criticalRisks`, and every
   `DueDiligenceReportView` section's `findings`.
4. [ ] `InvestmentMemoView` shows an honest empty state for
   `recommendations`, never a placeholder recommendation.
5. [ ] `DueDiligenceReportView` shows all eight sections, each
   correctly grouped by `Finding.category`, with an honest empty state
   per section with zero findings.
6. [ ] `DecisionArtifactLinks` is visible from `/projects/{id}` and
   correctly links to all three new routes.
7. [ ] `lib/decision/executive/executiveSummary.test.ts`,
   `.../memo/investmentMemo.test.ts`, `.../diligence/
   dueDiligenceReport.test.ts` all exist and pass — the first
   automated tests these three functions have ever had.
8. [ ] `npm test`/`tsc --noEmit`/`eslint` all pass with zero new
   errors.
9. [ ] `next build` succeeds; route count increases by exactly three:
   `/projects/[id]/executive-summary`, `/projects/[id]/memo`,
   `/projects/[id]/diligence` — no other route added, removed, or
   changed in rendering mode (confirmed by comparing the build's route
   table before and after, matching the exact verification method
   Milestones 29/30 already used).
10. [ ] Zero database changes — `git diff --stat` touches zero files
    under `supabase/migrations/`.
11. [ ] Zero changes to any of the five knowledge platforms or to
    `lib/decision/engine/`, `confidence/`, `evidence/`, `refresh/` —
    `git diff --stat` confirms only the files named in Section 3 are
    touched.
12. [ ] `DECISION_PLATFORM.md`'s "Status" line and "Future Consumers"
    section are updated to reflect reality.

---

# 14. Verification Plan

**Local verification:** `tsc --noEmit`, `eslint`, `npm run
test:coverage` (the three new unit test files must appear with real,
non-zero coverage for `executive/`, `memo/`, `diligence/` — previously
0%, confirmed by Milestone 30's own coverage report), `next build`.

**Manual/golden-path verification** (the routes' own, non-automated
coverage, per Section 7's honest limitation): sign in, open a real
project, click through to all three new routes, confirm correct
rendering, confirm the evidence trail is visible for at least one
finding, confirm sign-out redirects correctly, confirm a
wrong/nonexistent id 404s.

**Regression testing:** re-confirm `/projects/{id}` itself is
unaffected beyond the new `DecisionArtifactLinks` addition; re-confirm
`DecisionReport`/`DecisionSummaryPanel` render unchanged.

**Edge cases:** a project with zero findings/risks/evidence (this
environment's realistic case) renders every new view as an honest
empty state, not an error; a `Finding` with empty evidence renders
correctly; a `RiskFinding` (always evidenced, by schema) renders its
evidence correctly.

---

# 15. Implementation Plan

**Sub-milestone 31.1 — Executive Summary**
- *Files:* `app/projects/[id]/executive-summary/page.tsx`,
  `components/workspace/decision-report/ExecutiveSummaryView.tsx`,
  `lib/decision/executive/executiveSummary.test.ts`.
- *Outcome:* the smallest, simplest artifact wired and tested first,
  proving the whole pattern once before repeating it twice more.
- *Dependencies:* none.

**Sub-milestone 31.2 — Investment Memo**
- *Files:* `app/projects/[id]/memo/page.tsx`,
  `components/workspace/decision-report/InvestmentMemoView.tsx`,
  `lib/decision/memo/investmentMemo.test.ts`.
- *Outcome:* the fullest artifact, including the honest empty-
  recommendations state.
- *Dependencies:* none (independent of 31.1).

**Sub-milestone 31.3 — Due Diligence Report**
- *Files:* `app/projects/[id]/diligence/page.tsx`,
  `components/workspace/decision-report/DueDiligenceReportView.tsx`,
  `lib/decision/diligence/dueDiligenceReport.test.ts`.
- *Outcome:* the section-grouping artifact, including per-section
  empty states.
- *Dependencies:* none (independent of 31.1/31.2).

**Sub-milestone 31.4 — Navigation + documentation**
- *Files:* `components/workspace/decision-report/
  DecisionArtifactLinks.tsx`, `app/projects/[id]/page.tsx` (add the
  link row), `DECISION_PLATFORM.md`.
- *Outcome:* the three artifacts become discoverable, and the
  platform's own status documentation reflects reality.
- *Dependencies:* 31.1–31.3 (links to routes that must already exist).

Each sub-milestone gets its own `tsc`/`eslint`/`vitest run` pass before
the next begins, per this project's established discipline.

---

# 16. Final Self Review

**Unnecessary complexity, directly challenged:** the one real design
decision — whether to add a `lib/services/` wrapper around three pure
function calls — was examined and rejected in Section 7, following
existing precedent (`app/projects/[id]/page.tsx` already calls
`lib/decision` directly) rather than inventing a new layering rule for
this milestone alone.

**Duplicated logic:** none found, deliberately — this is the entire
point of the milestone. Every artifact-building call is a verbatim,
unmodified reuse of a Milestone-10-era function; every auth/ownership
check is a verbatim reuse of Milestone 29's `getProjectById`; every
new test reuses Milestone 30's fixture without modification.

**Over-engineering, directly challenged:** should this milestone also
wire the four other named future consumers, since they're listed in
the same `DECISION_PLATFORM.md` table? Rejected — none has a builder
function yet; building one would mean *generating* new judgment
(readiness scores, acquisition framing) this design explicitly
excludes. Should there be one unified `/projects/[id]/reports` page
with tabs instead of three routes? Rejected — three separate,
shareable, independently-linkable routes match this codebase's
existing per-page routing convention (`/projects/[id]` itself) more
closely than introducing client-side tab state for a purely
presentational need.

**Under-engineering, directly challenged:** is "no automated test for
the three new routes" an acceptable gap, or should this milestone
finally add Testing Library? Rejected — Milestone 30 explicitly and
recently scoped that decision out as a separate, larger investment;
reopening it inside a milestone about *reaching orphaned artifacts*
would be exactly the kind of scope conflation Section 12's own named
risk warns against. The gap is real, named honestly, and left for a
future, dedicated milestone.

**Maintenance burden:** three new small routes and components, plus
three new permanent test files — a small, honestly-bounded addition,
proportionate to three genuinely new, real user-facing surfaces.

**Architectural inconsistencies:** none found — this design introduces
zero new patterns (no new service shape, no new component category, no
new test tier) and repeats exactly four already-established ones
(the M29 protected-route pattern, the shared-primitive UI composition
pattern, the M30 pure-function test pattern, the `Button`+`Link`
navigation pattern).

**What this design deliberately does not claim:** it does not claim
Atlas AI now has "AI-generated investment recommendations" or "real
due diligence." It claims exactly what's true: three already-honest,
already-correct artifacts are now reachable, explainable via their
evidence trails, and tested for the first time — narrower than the
milestone's own title might suggest, stated plainly rather than
oversold, matching this project's consistent practice across every
design so far.

---

# 17. Principal Architect Review — Resolution Log

A full top-to-bottom re-read, verifying claims directly against the
codebase (not trusting the document) rather than a surface pass over
the 16 named categories. Findings and resolutions:

| # | Category | Finding | Resolution |
|---|---|---|---|
| 1 | Architectural correctness / documentation accuracy | Section 7's "no service file" justification cited `app/projects/[id]/page.tsx` as precedent for calling `lib/decision` directly — on re-verification, that page only passes through an already-built prop; it never calls a platform function itself. No such precedent actually exists anywhere in this codebase (every existing app-facing platform consumer goes through `lib/services/`). | Section 7 rewritten: same conclusion (no service file), but justified on its own merits — every *existing* service does real work beyond a bare call (Supabase I/O, row-mapping, a cross-cutting persistence trigger); these three functions would need none of that, so a wrapper would be a valueless rename, not a case of following convention. |
| 2 | Documentation accuracy | Deliverable 9's header said "`CLAUDE.md` update" but its entire body described updating `DECISION_PLATFORM.md`. | Corrected the header; added a note that `CLAUDE.md` itself needs no change, since its Roadmap never tracked Decision Intelligence as a numbered milestone. |
| 3 | UI integration / domain modeling | Section 7 claimed the three new views are "built entirely from existing shared primitives," but `decisionReadiness`'s five dimensions have never been rendered by any component in this codebase (confirmed: `DecisionSummaryPanel` renders every other `DecisionProfile` field except this one). | Named the one genuinely new (small, non-promoted, single-use) presentation need honestly in Deliverable 5, Section 7, rather than let the "existing primitives only" claim overstate the actual work. |
| 4 | Documentation accuracy | Deliverable 5 referenced "Deliverable 8's own doc comment" to explain the empty-recommendations state — Deliverable 8 is the unit-test deliverable and says nothing about recommendations; a broken cross-reference. | Corrected to reference Section 4's actual "Recommendation generation" Non-Goal. |
| 5 | Acceptance criteria completeness | AC3 said "every rendered `Finding`/`RiskFinding` shows its own `EvidenceList`" without noting that `ExecutiveSummary.criticalRiskCount` is a bare `number` by its own schema — no `RiskFinding` object ever reaches `ExecutiveSummaryView`, so there is nothing to attach evidence to there. | Scoped AC3 explicitly: applies to `topFindings`, `InvestmentMemoView`'s findings/risks, and every diligence section — not to a scalar count. |
| 6 | Domain modeling / documentation accuracy | No explicit statement that `ExecutiveSummaryView` and `DecisionSummaryPanel` render meaningfully different things (a reviewer could reasonably ask why both exist). | Added an explicit distinction to Deliverable 4: full/unsliced data (existing panel) vs. a top-N selection for a different reader (new view). |
| 7 | Acceptance criteria completeness | AC9's "route count increases by exactly three" didn't name the three expected paths. | Added the exact three route paths and the comparison method (matching Milestones 29/30's own verification style). |

**Explicitly confirmed, no change needed:**
- **Scope control:** the boundary between "wiring an existing artifact" and "generating new judgment" (recommendations, thesis, readiness) is correctly drawn and consistently enforced across Sections 2, 4, 5.4, and 12 — re-verified directly against `buildRecommendation`'s and `deriveDecisionReadiness`'s own doc comments, both confirmed still "architecture only" with zero generation logic anywhere in the codebase.
- **Security:** re-verified — all three new routes reuse `getProjectById` unmodified; no new data becomes reachable that wasn't already rendered by the existing `/projects/[id]` → `DecisionSummaryPanel` chain (confirmed by direct read of that component).
- **API design:** confirmed no JSON endpoint is needed or implied by anything in scope; the "no new API" conclusion is internally consistent with the PDF/export Non-Goal (no future consumer is assumed that would need one).
- **Performance:** re-verified — each `build*` function operates on already-small, single-project-scoped arrays via `.slice()`/`.filter()`/`.sort()`; no new database query shape.
- **Implementation sequencing:** 31.1–31.3 are genuinely independent (confirmed no shared new code between them, since Finding 1 above confirms no service file is introduced for them to share); 31.4 correctly depends on all three.
- **Testability boundary:** the "Server Components can't be integration-tested with today's tooling" limitation (Section 5.4/7) is real and correctly not papered over — re-confirmed against Milestone 30's own explicit exclusion of Testing Library/jsdom as a Non-Goal.
- **No unnecessary persistence, API, service, or AI orchestration** introduced anywhere — verified directly, not just asserted: zero new schemas, zero new database writes, zero new routes beyond the three Server Component pages, zero LLM calls.

No finding in this review added scope, a new dependency, or new decision-computation logic. Every fix either corrected a factual/citation error or made an existing honest-limitation disclosure more precise.

---

*End of design specification. Awaiting review before Sub-milestone
31.1 begins. No code has been written, no file modified.*
