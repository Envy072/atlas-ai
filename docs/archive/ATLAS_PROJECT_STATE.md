# Atlas AI Current State

## Document Metadata

- **Version:** 1.0
- **Generated from repository state**
- **Repository commit:** `4f803fc2c293023a2f3c1c1ab7827922054b4eaf` (short: `4f803fc`) — "Milestone 91: Test engine/pipelineEngine.ts, fix retry-recovery state corruption"
- **Latest completed milestone:** 91 (see "Current Milestone" for uncommitted work beyond this commit)
- **Generation date:** 2026-07-23

**Evidence sources:**
- Git history (`git log`, `git show`, commit timestamps and diff stats)
- Repository source code (direct reads, not inference)
- Milestone design documents (`MILESTONE_*_DESIGN.md`)
- Release summaries (`MILESTONE_46_RELEASE_READINESS_REVIEW.md`, incident reports)
- Tests (current suite composition and pass/fail state)

This document is the canonical engineering reference for Atlas AI. **When repository code and this document disagree, repository code is authoritative until this document is updated.**

> **Canonical project-state document**, reconstructed directly from the repository (commits, design docs, source code, tests) after the loss of the ChatGPT conversation that covered roughly Milestone 36 through Milestone 92. Every claim below is grounded in a specific file, commit, or direct code read — cited inline. Where the repository itself is ambiguous, contradictory, or silent, that is stated explicitly rather than guessed. This document supersedes stale claims in older docs where a conflict is noted.

---

## Current Milestone

- **Latest committed, pushed, CI-verified milestone: Milestone 91** — commit `4f803fc`, "Milestone 91: Test engine/pipelineEngine.ts, fix retry-recovery state corruption." This closed out unit-test coverage for the entire `lib/pipeline` platform (18/18 logic-bearing files now have a dedicated test) and fixed one real production defect (see "Milestone Timeline" below and "Active Technical Debt").
- **CI status (Milestone 91):** GitHub Actions run `29839586756` — **success** (lint, `tsc --noEmit`, `vitest run --coverage`, `next build` all passed).
- **Repository totals as of the last commit (`4f803fc`):** 126 test files, 868 passing tests.
- **Uncommitted local work beyond `4f803fc`** (verified via `git status --porcelain`): two new test files, `lib/decision/engine/decisionProfileBuilder.test.ts` and `lib/decision/evidence/evidenceAggregator.test.ts` (34 tests), implemented and fully verified locally (`tsc --noEmit` clean, `eslint --max-warnings 0` clean, full suite 128 files / 902 tests passing, `next build` succeeds) but **not yet committed, pushed, or CI-verified**. This closed a confirmed gap: two `lib/decision` collaborators (`buildDecisionProfile`, `aggregateEvidence`) previously had no dedicated test file of their own, only indirect exercise through `lib/pipeline/stages/decision.test.ts`.
- Also present in the working tree, untracked and unrelated to the above: `lib/decision/diligence/dueDiligenceReport.test.ts`, `lib/decision/executive/executiveSummary.test.ts`, `components/workspace/OpportunitiesCard.tsx`, `components/workspace/decision-report/ExecutiveSummaryView.tsx`, `app/projects/[id]/executive-summary/` (a full route), `MILESTONE_31_DESIGN.md`, and five `ATLAS_AI_*` strategy/roadmap markdown files — these represent other, separate in-progress work not covered by this document's own verified milestone history (see "Deferred Work" and "Files Every New AI Must Read").
- **Build status:** `next build` succeeds — 28 routes total (re-counted directly from the current build's own route table; an earlier draft of this document misreported this as "23," conflating it with the build log's unrelated "Generating static pages (23/23)" progress line, which counts only statically-prerendered pages, not the full route table). Next.js 16.2.10, Turbopack. One pre-existing, unrelated warning: "The `middleware` file convention is deprecated. Please use `proxy` instead" (Next.js migration note, not an error).
- **Repository health:** strong and improving — see "Repository Health" implicitly throughout; no known open `tsc`/`eslint`/build failures anywhere in the committed history.

---

## High-Level Architecture

Atlas AI is a market-intelligence platform: a founder describes a startup idea, and the system produces evidence-backed findings, risks, an investment thesis, recommendations, and a verdict — the way an investment committee would. The architecture is a strict, layered DAG. Nothing below imports anything above it; every cross-module dependency goes through a public barrel (`index.ts`), never a deep import.

```
User idea
   │
   ▼
lib/pipeline  ──orchestrates──▶  6 sequential stages, each wrapping one platform:
   │                              research → competitors → market → financial → business → decision
   │
lib/analysis-session  ──wraps lib/pipeline, adds friendly states/timeline/logs, owns no logic of its own
   │
lib/verification  ──reads an already-built DecisionProfile, classifies verified/unverified, computes nothing new
   │
app/ routes & lib/services  ──application seam, persistence, auth, billing, rate limiting
```

### Research pipeline (`lib/research/`)
`runResearch(request)` is the one entry point. It calls `searchViaProviderManager()` (never a provider directly), which fans out to real providers — **Tavily**, **Brave**, **Crunchbase** — through a resilience layer (`lib/research/manager/`: retry with exponential backoff, per-provider timeout, a fallback chain for `search_engine` providers trying Tavily then Brave, and health/metrics tracking). Four other providers (`google`, `reddit`, `github`, `news`) are registered but return `not_implemented` — architecture-only stubs, zero network calls. Every provider implements one common `ResearchProvider` interface (`lib/research/types/provider.ts`), enforcing the "no provider-specific logic leaks outside the provider layer" rule.

### Evidence pipeline (`lib/research/evidence/`, `lib/decision/evidence/`)
Raw provider results become `Source[]`, which get deduped (`lib/research/utils/deduplication.ts`) and ranked (`lib/research/ranking/rankingEngine.ts`) into `RankedSource[]`, then turned into `Evidence[]` via `buildEvidence()`. At the Decision layer, `lib/decision/evidence/evidenceAggregator.ts`'s `aggregateEvidence()` merges Source/Evidence lists gathered by every upstream platform (Research's own result plus each of Competitor/Market/Financial/Business's own profile) into one deduplicated pool — never inventing new evidence, only combining what already exists. `lib/decision/evidence/citableEvidence.ts`'s `computeCitableEvidence()` narrows this further to only the evidence already cited by findings + risks + thesis, for the stricter recommendation/verdict generation pool.

### Normalization (`lib/shared/`)
As of Milestone 51, `dedupeByKey<TItem>(items, keyFn)` and `urlDedupeKey(rawUrl)` are the one consolidated, shared implementation of what were four/five byte-identical copies across `lib/market`, `lib/financial`, `lib/business`, `lib/decision`, `lib/competitors`. A second, planned consolidation (`textNormalization.ts`'s `normalizeLabel`) was designed but **never executed** — three separate, still-duplicated copies remain in `lib/business/utils/`, `lib/financial/utils/`, `lib/market/utils/` (confirmed on disk). `lib/shared/` has no other consumers today.

### Decision engine (`lib/decision/engine/decisionEngine.ts`)
`synthesizeDecision(request)` is the platform's central synthesis function:
1. Runs `runResearch`, `discoverCompetitors`, `discoverMarket`, `discoverFinancials`, `discoverBusiness` in parallel (`Promise.all`).
2. Resolves durable competitor/market knowledge (`resolveCompetitorKnowledge`, `resolveMarketKnowledge`).
3. Aggregates evidence (`aggregateEvidence`).
4. Derives findings, critical risks, and an investment thesis (see "Findings," "Risks," "Thesis" below).
5. Composes everything into one `DecisionProfile` via `buildDecisionProfile()` (`lib/decision/engine/decisionProfileBuilder.ts`) — a pure, synchronous function with zero external I/O of its own; every real fact it uses is already computed and passed in.

### Findings (`lib/decision/findings/findingBuilder.ts`)
`deriveFindings(startupIdea, evidence)` calls `generateCandidateFindings()` (`lib/services/openai.ts`), then gates every candidate through `verifyClaim()` before calling the construction-only `buildFinding()`. A rejected candidate is dropped entirely, never shown with a caveat. Failure degrades to `[]`, never a fabricated fallback.

### Risks (`lib/decision/redflags/riskFinding.ts`)
Same shape as Findings: `deriveCriticalRisks(startupIdea, evidence)` → `generateCandidateRisks()` → `verifyClaim()` → `buildRiskFinding()`. `RiskFinding`'s schema requires at least one real `Evidence` entry (`evidence.min(1)`) — structurally stricter than an ordinary `Finding`, which may legitimately have none.

### Thesis (`lib/decision/thesis/investmentThesis.ts`)
`deriveInvestmentThesis(startupIdea, evidence)` produces four argument buckets (positive, negative, unknowns, contradictions) from `generateCandidateThesisArguments()`, each gated the same way. `deriveEmptyThesis()` is the honest, schema-valid empty default used whenever no thesis is supplied.

### Recommendation (`lib/decision/recommendations/recommendationGenerator.ts`)
`deriveRecommendations(startupIdea, findings, criticalRisks, investmentThesis)` is architecturally distinct from Findings/Risks/Thesis: it's **not** called from `synthesizeDecision()` (a `DecisionProfile` has no `recommendations` field) — it's a second-order derivation, invoked on demand via `buildDecisionArtifacts()`. It computes a stricter `citableEvidence` pool first, then generates and gates candidates the same way, then sorts by priority (`sortRecommendationsByPriority`).

### Traceability / verification (fail-closed generation gate)
`lib/decision/traceability/claimVerifier.ts`'s `verifyClaim(claim, evidence, relevanceStrategy?)` is the mechanism every one of the five AI-generation functions above (findings, risks, thesis, recommendations, verdict) runs every candidate through, composed of two stages:
1. `verifyClaimTraceability()` (Milestone 33) — every id in `citedEvidenceIds` must resolve exactly (case-sensitive) against the real evidence pool. Any single unresolved citation rejects the **whole** claim — never partial credit.
2. `verifyClaimRelevance()` (Milestone 40) — a pluggable, `async`-by-design relevance check; the default `keywordOverlapStrategy` requires at least one shared significant token between the claim and its resolved evidence, closing a real gap the M33 gate didn't cover (a citation can resolve to genuine evidence about an unrelated topic).

This is **architecturally distinct** from `lib/verification/` below — the traceability gate runs *before* a candidate is allowed to become a real object; `lib/verification` runs *after*, purely to classify what already exists.

### Verification / trust display (`lib/verification/`)
`buildVerificationSummary(profile)` is a read-only, post-hoc reclassification: a `Finding` counts as "verified" iff it has at least one `Evidence` entry; every `RiskFinding` is always verified (schema-guaranteed); `decisionLimitations` + `openQuestions` become `unverifiedStatements`. It computes nothing new and gathers no evidence — purely a presentation layer over an already-synthesized `DecisionProfile`.

### Reporting (`lib/decision/memo/`, `lib/decision/diligence/`, `lib/decision/executive/`)
Three pure reshapes of an existing `DecisionProfile`, no new generation: `buildInvestmentMemo(profile, recommendations, verdict)`, `buildDueDiligenceReport(profile)` (groups findings into 8 fixed categories), `buildExecutiveSummary(profile, maxItems)` (top-N selection only).

### OpenAI integration (`lib/services/openai.ts`)
The **only file in the codebase permitted to construct an OpenAI client**. Five exports — `generateCandidateFindings`, `generateCandidateRisks`, `generateCandidateThesisArguments`, `generateCandidateRecommendations`, `generateCandidateVerdict` — each using `chat.completions.parse()` with Zod-constrained structured output (`zodResponseFormat`), model `gpt-5.6-luna`, evidence capped at the top 25 by confidence per prompt, and every system prompt instructing the model to treat evidence content as untrusted reference material (a prompt-injection defense) and to never fabricate statistics.

### Provider abstraction (`lib/research/types/provider.ts`, `lib/research/providers/registry.ts`)
One `ResearchProvider` interface (`id`, `name`, `sourceType`, `search(query)`); a static registry map; `searchViaProviderManager()` is the only caller of any provider, ever.

### Schemas
Every cross-layer shape is a Zod schema in that layer's own `schemas/` folder, validated via `parseOrThrow()` (`lib/validation/parse.ts`) at construction time — never hand-duplicated as a second TypeScript interface. Types are always `z.infer<typeof Schema>`.

### Tests
Vitest, established at Milestone 30. Current committed totals: 126 test files / 868 tests (M91); locally, 128/902 pending the `lib/decision` commit above. Coverage is now complete for `lib/pipeline` (18/18) and largely mechanical/systematic across `lib/competitors` (17), `lib/business` (16), `lib/financial` (16), `lib/market` (19). `lib/research` (5 test files for a much larger file count) and `lib/decision` (13 → 15 test files once the pending commit lands, against 63 production files, of which roughly 41 are non-logic barrels/schemas/types — see the caveat in "Active Technical Debt" before treating this raw ratio as precisely scoped) are the least-covered platforms by raw file count.

---

## Milestone Timeline

Numbering note, verified directly: this repository has **two independent milestone-numbering schemes** that do not correspond to each other — (1) numbered git commits ("Milestone N: ..."), which this timeline follows, and (2) `CLAUDE.md`'s own `§21 Roadmap` list (Milestones 1–7, an unrelated backlog ordering, still mostly open even though the commit-numbered sequence has passed 90). Do not conflate the two.

### Pre-history — Sprint 2 / Sprint 3
Initial Next.js 16 / React 19 / TS-strict / Tailwind v4 / Zustand / Zod / Supabase / OpenAI scaffold, a `lib/services/` layer, typed error hierarchy, `lib/api/response.ts`, `lib/http/apiClient.ts`, shared UI primitives. `ARCHITECTURE.md` is a frozen snapshot of this state.

### Milestones 2 & 3 — folded into the Milestone 4 commit
No separate commits exist. `DASHBOARD.md`/`DESIGN_SYSTEM.md`/`RESEARCH_ENGINE.md` reveal these were real, separately-numbered pieces of work (Design System = "Milestone 2," Dashboard shell/home = "Milestone 2.1," report-section UI = "Milestone 3") but were committed together inside the `81148ad` "Milestone 4" commit rather than separately. No document explains why.

### Milestone 1 — AI Analysis Pipeline (`7795ddb`)
Decomposed a single giant OpenAI prompt into `lib/analysis/`'s 11 sequential typed stages. **Status: built, never made live** — the old single-call flow kept running in `app/api/chat/route.ts` because switching was deemed a separate, explicit decision. This entire subsystem was deleted wholesale at Milestone 25.

### Milestone 4 — Research Engine Architecture (`81148ad`)
`lib/research/` created: providers (typed placeholders), orchestrator (`runResearch`), ranking, evidence, cache. Zero real network calls at this point. Not wired into the application.

### Milestone 5 — Multi-Provider Research Integration (`556a2f6`)
`lib/research/manager/` (retry/timeout/fallback) added; Tavily and Brave became real providers. Old provider selector kept, unused, per this project's "no dead-code deletion without sign-off" norm.

### Milestones 6–10 — the six knowledge platforms, first versions
- **Milestone 6 — Competitors** (`6c433ea`): first durable, accumulating knowledge platform (`lib/competitors/`).
- **Milestone 7 — Market** (`fef193f`): `lib/market/`, first cross-platform dependency (consumes Competitors).
- **Milestone 8 — Financial** (`65d3de0`): `lib/financial/`, consumes Research + Competitors + Market.
- **Milestone 9 — Business** (`6210c60`): `lib/business/`, first pure-synthesis platform (no new discovery of its own — combines the three prior platforms).
- **Milestone 10 — Decision** (`6b3762d`): `lib/decision/`, the final synthesis layer; `ARCHITECTURE_REVIEW.md` audited all five platforms at this point (score 8.6/10, zero circular dependencies, first named debt: duplicated `dedupeByKey`/`urlDedupeKey` helpers).
None of these six platforms were wired into the live application until Milestone 14.

### Milestone 11 — Execution Pipeline (`5c7e31c`)
`lib/pipeline/` created — the orchestration layer wrapping all six platforms into one resumable, retryable, cancellable, checkpointed state machine (8 states, cooperative cancellation, exponential-backoff auto-retry). Not wired in yet.

### Milestone 12 — Analysis Session (`9681440`)
`lib/analysis-session/` created — a friendlier presentation wrapper over `PipelineExecution` (Timeline, Logs, friendly states), holding no source of truth of its own. Module deliberately renamed from `lib/session/` to avoid collision with an auth session.

### Milestone 13 — Verification Layer (`6397bda`)
`lib/verification/` created — the smallest platform (5 files), a pure function of an already-built `DecisionProfile`: "verified iff it has real Evidence."

### Milestone 14 — Application Integration (`ae4b450`)
First milestone to connect any of Milestones 4–13 to a real route. `lib/services/analysisSessions.ts` becomes the one new application-layer file allowed to import Session/Verification directly. New: `app/api/analysis-sessions/*`, `useAnalysisSession`, `DecisionReport`/`TrustPanel`. Old `lib/analysis/` (Milestone 1) and the old dashboard/workspace tree explicitly left in place, unused, pending a future deletion decision.

### Milestone 15 — Dashboard UX (`e4b27ad`)
Pure visual polish of the four Milestone-14 components; zero new `lib/` code or dependencies.

### Milestones 16–19 — platform "depth" passes
Wired each platform's already-built resolver/knowledge logic into the live decision path:
- **16 — Competitors** (`50042ec`): `resolveCompetitorKnowledge()`, fuzzy entity matching against the store.
- **17 — Market** (`cada496`): `resolveMarketKnowledge()`, exact-match resolution (no fuzzy matching needed); fixed a real bug where `hasMarketIndustry` had been vacuously `true` on every profile since Milestone 10.
- **18 — Financial** (`839e477`): full `FinancialProfile` passed through to `DecisionProfile`, but deliberately **no** resolver/store built — no natural cross-analysis identity exists yet (blocked on Authentication).
- **19 — Business** (`45a07ff`): full `BusinessProfile` added additively, alongside the pre-existing narrow `businessSummary` projection (a "one source, two projections" pattern).

### Milestones 20–23 — surfacing intelligence in the Decision Report UI
One new card each: **20 Competitor** (`23ff23e`), **21 Market** (`ab8c331`, establishes the canonical card ordering: Trust → Market → Competitor → Business → Financial → Decision Summary), **22 Financial** (`4eb36c2`), **23 Business** (`123b9be`). These milestones also surfaced two real fabrication bugs in the (still-live-at-the-time) legacy tree: `MarketChart.tsx`'s hardcoded five-year chart data and `FinancialCard.tsx`'s static recommendation text — both later deleted, not fixed, at Milestone 25.

### Milestone 24 — Decision Report Architecture Cleanup (`9572ef6`)
Pure refactor, zero behavior change (verified via byte-identical rendered-HTML diffs): five new `components/shared/` primitives (`StatCell`, `EvidenceList`, `TagList`, `StringList`, `severityTone.ts`) replacing duplicated JSX across the six Decision Report components. Caught and fixed two real pre-existing bugs along the way (an extra wrapper div, a heading-tag mismatch). Two pre-existing visual inconsistencies deliberately preserved via explicit props, not silently unified.

### Milestone 25 — Retire the Orphaned Legacy Analysis Flow (`19dd250`)
**Committed chronologically before Milestone 24**, despite the higher number (no cross-reference between the two design docs explains the mismatch). Deleted 79 files across 6 tiers plus a 4-file coupled cluster (`app/api/chat/route.ts`, `lib/services/analysis.ts`, `lib/services/openai.ts` [the original, pre-Milestone-34 version], `lib/schemas/analysis.ts`) — the entire pre-Milestone-10 analyze-idea implementation, the legacy dashboard/workspace tree, a never-wired 4th report-rendering generation, an orphaned thinking component, Milestone 1's `lib/analysis/` pipeline, and the legacy hook/store. Pure deletion — nothing replaced it. Named, unfixed side effect: with `createProject()` gone, the live flow had no persistence path at all.

### Milestone 26 — Project Persistence (`0b207d1`)
Closed the gap Milestone 25 left. New `ProjectSchema` composed from `DecisionProfileSchema`/`VerificationSummarySchema`. `persistProjectFromSession()` writes an **immutable snapshot** (not a pointer) — chosen because the session/pipeline stores are memory-only. Idempotency enforced by a database-level unique constraint on `session_id`, never an application-level check-then-insert.

### Milestone 27 — Supabase Auth (`6e53c78` + cleanup `5f73352`)
Closed CLAUDE.md's own Roadmap Milestone 4 from a complete blank slate. `lib/services/auth.ts`'s `getCurrentUser()` (uses `.auth.getUser()`, never `.auth.getSession()`) is the sole identity seam. **Two real security bugs found and fixed**: (1) `projects` table RLS had no policy at all for the `authenticated` role (silently denying every authenticated request); (2) session ids were sequential/guessable, letting any visitor read/cancel/retry any other visitor's session. Anonymous analysis remains a deliberate, approved product decision.

### Milestone 28 — Real Identity in the UI (`afd2de3`)
Completion work finishing Milestone 27 ("27d"). Shared `formatDisplayName()` helper; `getSafeRedirectPath()` guards against open-redirect abuse; a `confirm()` guard blocks navigation during an active poll.

### Milestone 29 — Close Visible Product Gaps (`15f825a`)
Fixed the real `/competitors` copy-paste bug (it had been rendering `/projects`'s content); added `app/projects/[id]/page.tsx` with enumeration-resistant lookup; made dashboard search real; rewrote four stub pages; added the first `error.tsx` boundaries.

### Milestone 30 — Testing & CI (`bab6258`)
**Foundational.** Vitest chosen over Jest (ESM/bundler alignment). Fixtures compose real production builders, never hand-authored shapes. First tests: pure utilities, `lib/decision/confidence` (the one representative knowledge-platform test), the services layer with a hand-rolled Supabase mock, and one full `/api/analysis-sessions` integration test. `.github/workflows/ci.yml` created: lint → `tsc --noEmit` → test:coverage → build, on every push/PR to `main`. Explicitly left untested: five of six knowledge platforms, `lib/services/openai.ts`, any React component.

### Milestones 32.1–32.3 — provider verification and correction
**32.1** (`2c946f5`): first automated tests for Tavily/Brave/`httpRequest`, verification only. **32.2** (`4628284`): Crunchbase provider made real (Data API v4); produced a real, resolved incident (`INCIDENT_32_2_ENV_LOCAL_READ.md` — see "Active Technical Debt"/process note below). **32.3** (`a749ad8`): first `computeHealth()` tests; corrected two stale claims in `lib/research/index.ts`/`RESEARCH_ENGINE.md` about `runResearch()` having no external callers.

### Milestone 33 — Traceability Verification Layer, Phase 2 Checkpoint A (`1fa06eb`)
Built `verifyClaimTraceability()` — the deterministic, zero-I/O citation-resolution gate every future real-generation function must pass through. Explicitly a formal GO/NO-GO gate for Milestones 34–37. Explicit non-goal at this point: never checks topical relevance, only that a citation resolves (this becomes Milestone 40's fix).

### Milestones 34–37 — Phase 2 Checkpoint B, the four real-generation facets
- **34 — Findings** (`ba9333f`): `lib/services/openai.ts` created (first real LLM integration since Milestone 25's deletion); `deriveFindings()` made real.
- **35 — Critical Risks** (`6dd36a4`): `deriveCriticalRisks()` made real; verified end-to-end against a live OpenAI + research run.
- **36 — Investment Thesis** (`b5fa9cf`): `deriveInvestmentThesis()` made real (the actual export — despite the commit title saying "buildInvestmentThesis," that function remains construction-only).
- **37 — Recommendations** (`6ba89fc`): `deriveRecommendations()` made real; architecturally distinct — invoked on demand, not from `synthesizeDecision()`.

### Milestone 38 — Final Verdict (`1e1c81c`)
Fifth and last real-generation function, `deriveVerdict()`. Introduced `buildDecisionArtifacts()` — the one shared computation point both `/projects/[id]/memo` and the Decision Report now call, instead of two independently-written call sequences. `computeVerdictConfidence()` is mechanically computed from real `Evidence.confidence` values, never model-generated. Also fixed an unrelated, severe pre-existing bug: an unneeded `"use client"` directive on `IconBadge.tsx` was crashing every Server Component call site in the Decision Report tree.

### Milestone 39 — Private Cohort Launch: Analysis Flagging (`4570ff5`)
`app/api/analysis-flags/route.ts`, insert-only RLS (no SELECT/UPDATE/DELETE policy at all — flags are reviewed only via the Supabase dashboard directly).

### Milestone 40 — Fabrication Finding Fix (`5803623`)
Closed the exact gap Milestone 33 named as an explicit non-goal: a citation can resolve to real evidence about an unrelated topic ("real citation, wrong topic"). Added `verifyClaimRelevance()` (pluggable, `async`-by-design; default strategy `keywordOverlapStrategy`) composed with the unchanged M33 gate into one `verifyClaim()`, now used by all five facet builders.

### Milestone 41 — Re-validation Interface (`7be9af3`)
`StaleAnalysisBadge` on the project detail page — zero new staleness logic, reuses `isDecisionStale()` (real since an earlier milestone, never load-bearing until now).

### Milestone 42 — deliberately skipped
Confirmed by `MILESTONE_46_RELEASE_READINESS_REVIEW.md`: "Idea Comparison" was deliberately deprioritized to post-launch at this slot — later delivered as Milestone 49.

### Milestone 43 — Real `/pricing` Page (`6da40ab`)
Replaced the stub with a real Free/Founder tier page; no billing logic yet (CTA rendered an honest disabled state).

### Milestone 44 — Full Stripe Integration (`e7d263b`)
`lib/services/stripe.ts`, webhook route, automated metering (`FREE_TIER_MONTHLY_ANALYSIS_LIMIT`). Pricing corrected from a placeholder $29 to the real Stripe Product's £29/month. Notable provenance: the Due Diligence route/component shipped in this commit is explicitly described as "real, complete Milestone 31 work" that had never been committed to git before — confirming `MILESTONE_31_DESIGN.md` (which exists on disk today, untracked) documents work whose actual implementation landed piecemeal, mostly here, not in any dedicated "Milestone 31" commit. Real-secret end-to-end webhook verification explicitly not done at commit time (missing `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`SUPABASE_SERVICE_ROLE_KEY` in this environment).

### Milestone 45 — Production Polish & Reliability (`565d42b`)
Stripe Customer Portal billing page, usage page, toast notifications, structured error messages. Fixed two real bugs: an infinite render loop in the toast effect, and a DOM-reconciliation crash caused by browser auto-translate racing React (fixed with `notranslate`). Renumbered the old, review-only "Milestone 45" to Milestone 46.

### Milestone 46 — Release Readiness Review (`534174a`, docs only)
Verdict: "B — Ready, with small changes recommended." Named two risks for a public, self-serve launch: guessable session ids, and zero rate limiting anywhere. Both closed immediately next, at Milestone 47.

### Milestone 47 — Session Ownership + Rate Limiting (`33c6dd9`)
Session ids switched to `crypto.randomUUID()`; `lib/services/rateLimit/` created (swappable `RateLimitStore`, Postgres today), with tier-aware buckets for `analysis:create` (the real abuse vector — a genuine 20–40s, money-spending pipeline run per call), `analysis:read`, `analysis:mutate`, `analysis:flag`, `billing:portal`.

### Milestone 48 — Welcome Onboarding (`f7c5b88`)
`app/welcome/page.tsx`, a single minimal post-signup step; `lib/copy.ts` extracted to de-duplicate one previously-repeated sentence.

### Milestone 49 — Idea Comparison (`488ee35`)
`app/projects/compare/page.tsx` — the feature deliberately deprioritized past Milestone 42, delivered here.

### Milestone 50 — Storage Backend Consolidation (`e91fb67`)
Deleted `postgresStore.ts`/`warehouseStore.ts` from seven platforms' `storage/` folders, collapsing each to a shared `createStore.ts` pattern. Pure subtraction (76 insertions / 619 deletions).

### Milestone 51 — Shared Dedup/URL-Normalization Utilities (`7b965d2`)
Created `lib/shared/` (`dedupeByKey`, `urlDedupeKey`), consolidating four/five byte-identical copies (`ARCHITECTURE_REVIEW.md`'s Technical Debt #1, first named at Milestone 10, closed 41 milestones later). **Not fully executed**: the design's own Tier 2 (`normalizeLabel`/`textNormalization.ts`) was planned but never consolidated — three separate copies still exist in `lib/business`, `lib/financial`, `lib/market`.

### Milestones 52–91 — the unit-test-coverage series (one long arc)
Systematic, one-file-per-milestone (or small group), mechanical test-authoring across five platforms, governed by one consistent rule sharpened over the series: "mock only the one true external boundary" (`runResearch`), let every other real, already-tested collaborator run unmocked. Order: **lib/competitors** (52–54) → **lib/business** (55–57) → **lib/financial** (58–60) → **lib/market** (61–73, the longest stretch) → **lib/pipeline** (74–91). Final coverage ratios (production `.ts` files / `.test.ts` files): competitors 40/17, business 52/16, financial 52/16, market 47/19, pipeline 40/18 (100% of logic-bearing pipeline files). **Milestone 91** is the most significant of the whole arc: testing `pipelineEngine.ts` (the platform's own composition root) surfaced a real production defect — a stage that failed once and then succeeded on retry corrupted its persisted state back to `"retry_pending"` (via `checkpointPreservingConcurrentState` reading a stale store value), eventually crashing on an illegal `"retry_pending" → "completed"` transition. Root cause: a `"running"` transition after backoff was never persisted before the retried attempt ran. Fixed with one added `writeCheckpoint()` call, approved explicitly as a scoped exception to the milestone's "test file only" rule.

### Current, uncommitted work (not yet a numbered milestone in any committed history)
Two new test files closing the `lib/decision` gap the M90/M91 series explicitly disclosed: `decisionProfileBuilder.test.ts` (28 tests) and `evidenceAggregator.test.ts` (6 tests), zero mocks (neither function has a true external boundary), zero production changes. Verified locally; not committed.

---

## Current Pipeline

Complete runtime flow, user input → final report, traced through real imports:

```
1. UI/route calls lib/analysis-session.createSession(input, ownerId)
     → lib/pipeline.startPipeline({ startupIdea })
2. lib/pipeline's runFromCurrentStage() drives 6 stages in order, checkpointing after every attempt,
   auto-retrying failures with exponential backoff, observing cooperative cancellation at every boundary:
     stage 0: researchStage    → runResearch(...)            [lib/research]
     stage 1: competitorsStage → discoverCompetitors(...)    [lib/competitors]
     stage 2: marketStage      → discoverMarket(...)         [lib/market]
     stage 3: financialStage   → discoverFinancials(...)     [lib/financial]
     stage 4: businessStage    → discoverBusiness(...)       [lib/business]
     stage 5: decisionStage    → synthesizeDecision(...)     [lib/decision] ← final stage
3. Inside synthesizeDecision(): re-runs research + all four discovery calls in parallel (each
   stage's own deep-dive, since stages only ever pass {startupIdea} forward, never pre-fetched
   context — an accepted, documented redundancy), resolves competitor/market knowledge, aggregates
   evidence, derives findings/risks/thesis (each generated via lib/services/openai.ts and gated
   through lib/decision/traceability's verifyClaim()), and composes one DecisionProfile.
4. The DecisionProfile is stored in PipelineExecution.context.decision, surfaced as
   AnalysisSession.result via lib/analysis-session's composeAnalysisSession(), and persisted as a
   `projects` row (immutable snapshot) via lib/services/projects.ts's persistProjectFromSession()
   — but only if the caller is signed in; anonymous completions are never persisted.
5. On demand, per route (NOT part of the pipeline run itself):
     app/projects/[id]/memo/page.tsx        → buildDecisionArtifacts(profile) → buildInvestmentMemo(...)
     app/projects/[id]/diligence/page.tsx   → buildDueDiligenceReport(profile)
     app/projects/[id]/executive-summary/   → buildExecutiveSummary(profile)   [route currently uncommitted]
6. Separately, a read-only trust view: buildVerificationSummaryFromSession(session)
     → buildVerificationSummary(session.result.profile)  [lib/verification]
```

The client polls `GET /api/analysis-sessions/[id]` every ~1.75s while the session is non-terminal (no streaming; the `ai` package is installed but unused).

---

## Public APIs

Every export listed below is the **actual, current barrel** (`index.ts`) of its module — verified by direct read, not inferred.

**`lib/research/index.ts`**: `runResearch`, `selectProviders`, `searchViaProviderManager`, `getAllMetricsSnapshots`, `getMetricsSnapshot`, `computeHealth`, `rankSources`, `buildEvidence`, `buildCitation`, `createCache`, `getRegisteredProviders`, `getProviderById`, plus all schemas/types.

**`lib/decision/index.ts`**: `buildDecisionProfile`, `mergeDecisionProfile`, `synthesizeDecision`, `buildInvestmentThesis`/`deriveEmptyThesis`/`deriveInvestmentThesis`, `buildFinding`/`deriveFindings`, `buildRiskFinding`/`deriveCriticalRisks`, `aggregateEvidence`, `verifyClaimTraceability`, `computeDecisionConfidence`, `buildReadinessAssessment`/`deriveDecisionReadiness`, `aggregateRecommendations`/`sortRecommendationsByPriority`, `deriveRecommendations`, `buildDecisionVerdict`/`deriveVerdict`, `buildDecisionArtifacts`, `buildInvestmentMemo`, `buildDueDiligenceReport`, `buildExecutiveSummary`, refresh functions (`requestManualRefresh`, etc.), `isDecisionStale`, `createStore`, `MemoryDecisionStore`, plus all schemas/types.

**`lib/services/openai.ts`** (no barrel, direct exports): `generateCandidateFindings`, `generateCandidateRisks`, `generateCandidateThesisArguments`, `generateCandidateRecommendations`, `generateCandidateVerdict`.

**`lib/pipeline/index.ts`**: `startPipeline`, `resumePipeline`, `retryStage`, `cancelPipeline`, `getExecution`, `subscribeToExecution`, `canTransition`/`isTerminalState`/`assertTransition`, `computeProgress`/`TOTAL_STAGES`, retry helpers, `createStore`, `MemoryPipelineStore`.

**`lib/analysis-session/index.ts`**: `createSession`, `getSession`, `listSessions`, `cancelSession`, `retrySession`, `resumeSession`, `getLogs`, `subscribeToSession`, `projectSessionState`, `buildTimeline`/`STAGE_ORDER`, `buildLogs`, `formatProgress`, `createStore`, `MemoryAnalysisSessionStore`.

**`lib/verification/index.ts`**: `buildVerificationSummary`, `buildVerificationSummaryFromSession`, plus schemas.

**`lib/services/`** (no shared barrel; each file exports directly): `auth.ts` (`getCurrentUser`), `projects.ts` (`listProjects`, `getProjectById`, `countProjectsThisMonth`, `persistProjectFromSession`), `analysisSessions.ts` (`startAnalysisSession`, `getAnalysisSession`, `cancelAnalysisSession`, `retryAnalysisSession`, `CreateSessionInputSchema`), `stripe.ts` (`FREE_TIER_MONTHLY_ANALYSIS_LIMIT`, webhook handlers, `getUserTier`, `createBillingPortalUrl`), `analysisFlags.ts` (`submitAnalysisFlag`), `rateLimit/index.ts` (`checkRateLimit`, `RATE_LIMITS`, `createStore`).

**Each of the four other knowledge platforms** (`lib/competitors`, `lib/market`, `lib/financial`, `lib/business`) exposes its own `index.ts` barrel with a `discoverX()` entry point, a `resolveXKnowledge()` (Competitors/Market only), builders, and storage factory — not individually re-enumerated here; follow the same shape confirmed for Decision/Pipeline above.

---

## Important Architectural Decisions

Every item below is load-bearing; changing it without a deliberate, reviewed decision would silently regress something the codebase depends on.

- **Strict layered DAG, public-barrel-only imports.** Research ← Competitors ← Market ← Financial ← Business ← Decision ← Pipeline ← Analysis-Session ← Verification/App. No deep imports, no circular dependencies — verified by grep at Milestone 10 and never violated since. *Why:* lets any one layer be swapped or reasoned about without tracing five other files.
- **Fail-closed evidence gating (`verifyClaim`).** Every AI-generated claim, in every one of the five facets, must resolve its citations exactly and pass a relevance check before becoming a real object; any rejection drops the candidate entirely — never a partial-credit or "shown with a caveat" fallback. *Why:* this is the product's entire trust proposition; a single silent exception would undermine the "never fabricates" claim across the whole platform.
- **`lib/services/openai.ts` is the sole OpenAI touchpoint.** No other file constructs an OpenAI client. *Why:* keeps prompt/model changes reviewable in one place, and keeps provider-swap feasible.
- **Checkpoint-as-full-snapshot, never a diff.** Every pipeline state write persists the complete current `PipelineExecution`. *Why:* resuming never needs to replay history; a partial/diffed checkpoint would need reconciliation logic that doesn't exist.
- **Cooperative, stage-boundary cancellation — never mid-stage.** No platform call accepts an `AbortSignal` today; cancellation is observed only at stage boundaries and mid-backoff checks. *Why:* stated as a real, accepted limitation, not an oversight — building true mid-call cancellation would require every platform and provider to support it.
- **Retry counts are always derived from history, never separate counters.** `countAutoRetries`/`countManualRetries` filter `stageHistory` live. *Why:* a derived fact can never drift from what actually happened; a separate counter could.
- **Immutable project snapshots, insert-only, idempotent via a DB unique constraint.** `persistProjectFromSession()` never upserts; uniqueness on `session_id` is enforced at the database layer, not via an application check-then-insert. *Why:* avoids a race window; a completed analysis is a permanent historical record, not a mutable cache entry.
- **Anonymous analysis is a deliberate, twice-reconfirmed product decision** (Milestones 27, 44) — the analysis-session API and `/dashboard/analysis` stay fully public; only persistence requires sign-in. *Why:* explicitly approved product scope, not an oversight to "fix" by adding an auth gate.
- **`getCurrentUser()` always uses `.auth.getUser()`, never `.auth.getSession()`.** *Why:* the former revalidates against Supabase Auth; the latter trusts an unrevalidated JWT — using it for authorization would be a real security regression.
- **Ownership mismatches are indistinguishable from "not found."** Confirmed directly in current source: `lib/services/projects.ts`'s `getProjectById(id, userId)` filters by `.eq("owner_id", userId)` and returns `null` for both a nonexistent id and one belonging to another user; `lib/services/analysisSessions.ts` throws a generic `InvalidRequestError` rather than any distinguishing status for an ownership mismatch. *Why:* prevents an id-enumeration side-channel. **Correction from an earlier draft of this document:** that draft additionally claimed a specific `ForbiddenError`(403) was introduced at Milestone 27 and later replaced — this could not be verified (no `ForbiddenError` class exists anywhere in the current codebase or in `lib/errors/AppError.ts`'s git history) and has been removed. What is verified is that guessable session ids were fixed at Milestone 27 (RLS ownership enforcement) and Milestone 47 (`crypto.randomUUID()` replacing sequential ids) — treat the exact intermediate mechanics between those two points as unverified.
- **One schema, one inferred type, reused everywhere — never hand-duplicated.** *Why:* a prior mismatch bug (referenced in `CLAUDE.md`) was fixed once already by adopting this rule.
- **No dead-code deletion without explicit, separately-scoped sign-off**, except when a dedicated retirement milestone (25, 50) does it as its entire purpose, verified via exhaustive static-import analysis first. *Why:* keeps risky deletions auditable and reversible via git history, never silently bundled into an unrelated change.
- **Never call a file-reading tool directly on `.env*` files.** Established after `INCIDENT_32_2_ENV_LOCAL_READ.md` — use value-blind shell checks/edits instead. *Why:* a real secret-exposure incident (contained, but real) occurred this way once already.
- **Test-coverage series: mock only the one true external boundary (`runResearch`), everything else real.** *Why:* every other collaborator is already independently tested and pure/synchronous; mocking it too would hide real integration bugs — exactly the retry-recovery corruption Milestone 91 caught.

---

## Repository Conventions

- **Six architectural layers** (`CLAUDE.md` §3): App Router → UI → Hooks → Store (Zustand) → Services/Business Logic → Cross-cutting (schemas/errors/validation/http/api/format). Routes are thin controllers; business logic never lives in a route/hook/component.
- **TypeScript strict, zero `any`.** Unknown boundary values are typed `unknown` and narrowed via a schema, never widened.
- **Folder rules are prescriptive** (`CLAUDE.md` §4) — every file has exactly one correct folder; verified partially drifted from current reality (see "Active Technical Debt").
- **Testing:** Vitest; one test file per production file as the default convention; fixtures compose real production builders (never hand-authored shapes); mock only genuine external boundaries; no shared test helpers/abstractions until justified by three or more files.
- **Commit style:** imperative, scoped, explains why not just what; never mixes a refactor and a feature in one commit; force-push/history-rewrite requires explicit sign-off.
- **Milestone workflow** (this is the process this document's own reconstruction was produced under, for the most recent ~30 milestones): fresh Cohesion Verification (re-derive facts from current repo state, never trust prior conclusions) → Planning Review (Objective/Dependencies/Affected Modules/In Scope/Out of Scope/Risks/Acceptance Criteria/Verification Plan) → Product Value / Architecture / Opportunity Review → explicit approval → implementation → full verification pipeline (`tsc --noEmit`, `eslint --max-warnings 0`, targeted then full `vitest run`, `next build`, mechanical audit for TODO/FIXME/console.log/debugger/eslint-disable/.only/.skip) → Implementation Report → explicit approval → commit (staged files verified to contain only the approved scope) → push → poll CI to completion → Completion Report → explicit approval before any new milestone.
- **CI** (`.github/workflows/ci.yml`): single job, `permissions: contents: read`, on every push/PR to `main` — `npm ci` → lint → `tsc --noEmit` → `test:coverage` → `next build`. Uses only placeholder, non-functional `.invalid`-TLD env values; no real secret ever touches CI.
- **Documentation workflow:** design docs (`MILESTONE_N_DESIGN.md`) are point-in-time historical records, deliberately never retroactively corrected after the fact (confirmed explicitly at Milestone 27's cleanup commit) — treat any platform doc's "Status: not wired into the application" line as potentially stale, and verify against current code rather than trusting it.

---

## Active Technical Debt

Only items with direct repository evidence.

- **`lib/decision` has the lowest raw test-file count relative to its total file count of any platform** — 13 committed test files (15 once the pending commit lands) against 63 production files, versus competitors 17/40, business 16/52, financial 16/52, market 19/47. **Caveat, verified directly:** unlike the `lib/pipeline` figure elsewhere in this document (confirmed as exactly 18 logic-bearing files / 18 tests, i.e. genuinely complete), this 63-file count for `lib/decision` has **not** been decomposed into logic-bearing files versus non-logic files — a direct count shows `lib/decision` has 17 `index.ts` barrels, 21 files under `schemas/`, and 3 files under `types/` (41 non-logic files, several of which overlap in these three categories and were not de-duplicated in this count), meaning the true logic-bearing file count is well below 63 and the real coverage gap is smaller than the raw 13-vs-63 comparison implies. Treat this as a real but **imprecisely scoped** gap — a fresh Cohesion Verification (the same technique used for the `lib/pipeline` series) is needed before selecting specific files to test, not this raw ratio.
- **Milestone 51's Tier 2 consolidation was never executed.** `normalizeLabel`/`textNormalization.ts` remains duplicated, byte-for-byte, across `lib/business/utils/`, `lib/financial/utils/`, `lib/market/utils/` (each with its own `.test.ts`), even though the design doc that shipped `lib/shared/` explicitly scoped this as part of the same Definition of Done.
- **`lib/shared/` has zero real importers today.** Confirmed by the module's own design intent ("entirely inert until a platform that doesn't exist yet imports from it") and by the current consumer list — only `dedupeByKey`/`urlDedupeKey` are used, and only by the platforms that were retrofitted at Milestone 51 itself.
- **`CLAUDE.md`'s Folder Rules (§4) and Roadmap (§21) are stale relative to current reality.** Current `components/` has `settings/` and `projects/` top-level folders plus several second-level subfolders (`dashboard/home`, `dashboard/shell`, `workspace/command-center`, `workspace/decision-report`, `workspace/history`, `workspace/session`) not documented in §4. §21's Milestones 1, 2, 3, 5, 6 remain unmarked/open even though the separate, much-further-advanced commit-numbered milestone sequence (now past 91) has resolved large parts of that scope under different names.
- **Multiple platform docs (`COMPETITOR_PLATFORM.md`, `MARKET_PLATFORM.md`, `FINANCIAL_PLATFORM.md`, `BUSINESS_PLATFORM.md`) still say "Status: not wired into the application,"** confirmed stale — Milestones 16–19 wired each one in, but per Milestone 27's cleanup commit these historical docs are deliberately never retroactively updated. Not a code defect, but a documentation trap for any reader who trusts these docs at face value.
- **`VERIFICATION.md` predates Milestones 34–40** (real evidence-constrained generation, the traceability+relevance gate) — its framing that findings/risks are "often thin or empty... with no search-provider credentials configured" is now outdated relative to current code, though its description of `lib/verification`'s own responsibilities is still accurate.
- **`ATLAS_AI_PHASE_3_REVIEW.md`** (untracked) is materially stale — it reports "zero automated tests and zero CI" and "no rate limiting" as open findings, both resolved since (Milestones 30 and 47 respectively).
- **`app/projects/[id]/executive-summary/` and its supporting components are currently uncommitted** (`components/workspace/OpportunitiesCard.tsx`, `components/workspace/decision-report/ExecutiveSummaryView.tsx`) — real, seemingly-functional code sitting untracked in the working tree; status unclear (in-progress vs. abandoned) without further investigation.
- **No dedicated "Milestone 31" commit exists**, yet Milestone 44's own commit body describes shipping "real, complete Milestone 31 work" (the Due Diligence route) that had "never been committed to git before." `MILESTONE_31_DESIGN.md` exists on disk but is untracked. Its actual implementation appears to have landed piecemeal across later commits, primarily Milestone 44.

---

## Deferred Work

Explicitly named in the repository as intentionally postponed, not silently dropped:

- Real streaming AI responses — the `ai` package is installed (`^7.0.16`) and confirmed unused; the client still polls every ~1.75s.
- End-to-end (Playwright) tests, PR preview deployments — named in `CLAUDE.md`'s Roadmap Milestone 7 as explicitly not delivered by Milestone 30.
- React component tests — no Testing Library infrastructure exists yet (named explicitly at Milestone 41 as a reason no component test was added there).
- 30-day project-history enforcement for Free-tier users — named at Milestone 44 as explicitly not implemented.
- Real, per-user financial/business-profile accumulation across analyses — blocked on an identity key that doesn't naturally exist yet (named at Milestones 18 and 19; Authentication existing since Milestone 27 hasn't closed this specific gap).
- `lib/research/cache/`'s Redis/Database cache backends — architecture-only stubs; `createCache()` exists but isn't wired into `runResearch()`.
- Four research providers (`google`, `reddit`, `github`, `news`) — registered, architecture-only, return `not_implemented`.
- `lib/research/ranking/factors.ts`'s five scoring functions — all hard-coded placeholders returning 50; only the composition/sort logic around them is real.
- The `ATLAS_AI_POST_V2_EXECUTION_ROADMAP.md` — explicitly states it "becomes active only after" the current official roadmap and all remaining engineering-quality work is fully finished; not currently active, per its own text.

---

## Future Roadmap

Two different roadmap documents exist and must not be conflated:

1. **`CLAUDE.md` §21** (older, separate numbering) still lists open items: unify the (now-deleted) legacy analyze-idea implementation [moot — deleted at Milestone 25, this entry itself appears stale], surface full AI output, complete the product surface, billing [done, per commit history, but unmarked here], reliability/scale hardening (rate limiting [done at M47, unmarked here], streaming, retry/backoff).
2. **`ATLAS_AI_V2_ROADMAP.md`** (tracked, currently locally modified) — the actually-current, commit-numbered roadmap. States Version 1 (Milestones 1–31) and Version 2 (Milestones 32–51) both complete. Beyond Milestone 51, the committed history continues with the Milestone 52–91 test-coverage series (not originally named as part of this roadmap's own numbered plan, but executed as real engineering work).
3. **`ATLAS_AI_POST_V2_EXECUTION_ROADMAP.md`** (untracked draft) — a proposed successor, explicitly gated on full completion of the above, describing 10 future phases (platform capability, UX completion, UI polish, enterprise readiness, competitive excellence, AI innovation, product intelligence, platform optimization, global polish, launch prep) at a genre/checklist level, not yet concretely scoped into milestones.

**The most concrete, evidence-grounded next step**, based purely on current repository state (not the draft post-V2 document): closing the `lib/decision` test-coverage gap further (the platform with the lowest test-to-file ratio), and/or the Milestone 51 Tier 2 consolidation that was scoped but never executed.

---

## Files Every New AI Must Read

In this order, before making any change:

1. **`CLAUDE.md`** — the standing engineering handbook: architecture layers, folder rules, TypeScript/React/Zustand/Services/UI/Tailwind/Component/Error-handling/API/Validation/Performance/Security rules, code review checklist, Definition of Done, sprint workflow. Read fully; treat as binding even where this document notes it's partially stale (the *rules* are current even where the *roadmap section* isn't).
2. **`AGENTS.md`** — one paragraph, easy to miss: this Next.js version has breaking API/convention changes from training-data assumptions; read `node_modules/next/dist/docs/` before writing Next.js-specific code.
3. **This document (`ATLAS_PROJECT_STATE.md`)** — the reconstructed history and current state.
4. **`ARCHITECTURE_REVIEW.md`** — the one formal, cross-platform audit (Milestone 10), useful for understanding the DAG discipline and the original debt list.
5. **`TESTING.md`** — current testing conventions, what's tested, what deliberately isn't.
6. **The relevant platform doc** for whatever area you're touching (`RESEARCH_ENGINE.md`, `PROVIDER_MANAGER.md`, `COMPETITOR_PLATFORM.md`, `MARKET_PLATFORM.md`, `FINANCIAL_PLATFORM.md`, `BUSINESS_PLATFORM.md`, `DECISION_PLATFORM.md`, `EXECUTION_PIPELINE.md`/`PIPELINE.md`, `ANALYSIS_SESSION.md`, `VERIFICATION.md`) — but verify claims against current source, since these are point-in-time snapshots never retroactively updated.
7. **The actual source files for the module you're changing** — never trust a doc's "Status" line over a direct read of the code.
8. **`.github/workflows/ci.yml`** — know exactly what will gate your change before you push.
9. **`ATLAS_AI_V2_ROADMAP.md`** — only if you need the product-level roadmap framing; cross-check its milestone numbers against actual git log, since it and `CLAUDE.md` §21 use different schemes.

---

## AI Handoff

You are picking up this project with no memory of the conversation that built most of it. Everything below is what you need to continue correctly.

**Current architecture:** a strict, layered DAG — Research → four independent knowledge platforms (Competitors, Market, Financial, Business) → Decision (synthesis) → Pipeline (orchestration) → Analysis-Session (presentation wrapper) → Verification (read-only trust display) → App layer (routes, services, persistence, auth, billing, rate limiting). Every layer imports only the public barrel of the layer(s) below it — never a deep import, never a circular dependency. The single most important behavioral guarantee in the whole system is the fail-closed evidence-verification gate (`verifyClaim()` in `lib/decision/traceability/claimVerifier.ts`): every AI-generated claim (finding, risk, thesis argument, recommendation, verdict) must resolve its cited evidence exactly and pass a relevance check, or it is dropped entirely — never shown with a caveat, never partial credit. Protecting this guarantee is more important than almost anything else in this codebase.

**Engineering philosophy** (verbatim priority order from `CLAUDE.md` §2): readability first, then maintainability, then architectural scalability, then consistency, then performance. Never optimize for short code. Unnecessary abstraction is exactly as bad as unnecessary cleverness.

**Coding standards:** TypeScript strict, zero `any` ever; `type` for unions/aliases, `interface` for object shapes; every shared shape is one Zod schema with one inferred type, never hand-duplicated; functional React components only, Server Components by default; Zustand only for genuinely cross-component shared state, selectors always (never whole-store destructuring); services are plain async functions with zero React/Next.js imports and throw typed `AppError` subclasses, never bare `Error`.

**Review standards:** every deliberate failure throws a typed error; every external input (HTTP body, AI output, API response) is schema-validated before use, client and server both validate independently; routes are thin controllers that delegate to exactly one service; `tsc --noEmit` and `eslint --max-warnings 0` must be clean with zero new issues before anything is considered done.

**Milestone process** (the process governing roughly the last 40 milestones, and the one you should default to unless told otherwise): for each unit of work, perform a **fresh** Cohesion Verification — re-derive every architectural fact from the *current* repository state directly, never from a prior milestone's summary, conclusion, or dependency count, even if you (or a predecessor) already did this analysis recently. Then produce a Planning Review (8 sections: Objective, Dependencies, Affected Modules, In Scope, Out of Scope, Risks, Acceptance Criteria, Verification Plan), plus Product Value / Architecture / Opportunity reviews. Wait for explicit approval before writing any code. Implement only the approved scope. Run the full verification pipeline. Wait for explicit approval before committing. Stage only the approved files (verify via `git status`/`git diff --cached --stat` — this repository routinely has unrelated uncommitted work sitting in the tree from other efforts; never sweep it into your commit). Push only when asked. Poll CI to completion and report its real status, not an assumption.

**Testing process:** Vitest; one test file per production file by default; mock only a genuine external boundary (for anything touching the research/decision chain, that boundary is `runResearch` — everything else downstream is real, synchronous or already-tested, and should run unmocked); prefer real production builder functions for fixtures over hand-authored object literals; never add a shared test helper until at least three files would use it.

**CI requirements:** every push/PR to `main` runs lint → `tsc --noEmit` → `vitest run --coverage` → `next build`, using only placeholder env values (never real secrets). All four must pass; there is no bypass.

**Repository rules:** never commit `.env*` contents; never call a file-reading tool directly on an `.env*` file (a real, contained secret-exposure incident happened this way once — use value-blind grep/sed instead); never force-push or rewrite history without explicit sign-off; never delete code without explicit, separately-scoped authorization (the two real deletion milestones in this project's history, 25 and 50, were each their *entire* milestone, verified via exhaustive import analysis first); never mix a refactor and a feature in one commit.

**Things NEVER to change without an explicit, reviewed decision:**
- The fail-closed evidence-verification gate's behavior (never let an unresolved citation or a topically-irrelevant match through).
- The rule that `lib/services/openai.ts` is the only file allowed to construct an OpenAI client.
- The checkpoint-as-full-snapshot pattern in `lib/pipeline` (never a diff).
- The insert-only, snapshot (never pointer), idempotent-via-DB-constraint persistence model for `projects`.
- The rule that an ownership mismatch is indistinguishable from "not found" (never a distinguishing 403) — this closes a real, previously-exploited enumeration vulnerability.
- `getCurrentUser()`'s use of `.auth.getUser()` over `.auth.getSession()` for any authorization decision.
- The strict layered DAG — do not introduce a deep import or a circular dependency between platforms.
- Anonymous analysis access — this is an approved, twice-reconfirmed product decision, not a bug to "fix" with an auth gate.

**Common mistakes to avoid** (each backed by something that actually happened in this project's history):
- Trusting a platform doc's "Status: not wired into the application" line — several are known-stale (Milestones 16–19 wired those platforms in; the docs were deliberately never updated).
- Assuming git-commit milestone numbers and `CLAUDE.md` §21's roadmap numbers refer to the same sequence — they don't.
- Assuming every markdown file at the repo root reflects committed, official state — several `ATLAS_AI_*` strategy documents are untracked, in-progress drafts from a separate effort, not the official roadmap.
- Reasoning about "what's tested" from file-count ratios alone — a platform's raw file count includes barrels, schemas, and pure-type files that this codebase's own convention never unit-tests directly; compare against logic-bearing files only.
- Assuming a prior milestone's dependency analysis still holds — this codebase's own recent process explicitly requires re-deriving it fresh every time, because the DAG has grown continuously.
- Silently fixing a documentation staleness issue as a "drive-by" inside an unrelated change — note it, don't fix it uninvited, unless that's the explicit scope of the current task.
- Bundling unrelated uncommitted work (there is usually some sitting in the tree — check `git status` before every commit) into your own commit.
