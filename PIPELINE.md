# Atlas AI — Analysis Pipeline

This document describes the modular analysis pipeline introduced under
`lib/analysis/`. It replaces "one OpenAI call, one giant prompt" as the
*internal* architecture for producing a startup analysis, decomposing that
single call into eleven independently-typed stages.

**Status: built, not yet live.** `app/api/chat/route.ts` still calls the
original `lib/services/analysis.ts` → `lib/services/openai.ts` path
unchanged. The pipeline in this document is complete, real, and callable
(`runAnalysisPipeline(idea)` genuinely calls OpenAI once per stage), but
nothing in the live app invokes it yet — see "Cutover status" below for
why, and what has to happen before it does.

---

## Pipeline Flow

A single call to `runAnalysisPipeline(idea: string)` runs all eleven stages
in sequence, each stage's output merging into a shared `PipelineContext`
that later stages read from:

```
idea
  → Idea Analysis            → idea, summary
  → Problem Analysis          → problem, solution
  → Market Analysis            → market_size
  → Customer Analysis           → customers
  → Competition Analysis          → competition
  → Business Model Analysis         → business_model
  → Risk Analysis                    → risks
  → Opportunity Analysis               → opportunities
  → Execution Roadmap                   → next_steps
  → Investment Scoring                    → score, verdict,
                                             investment_decision,
                                             confidence, strengths,
                                             weaknesses, sub-scores
  → Final Report Assembly                   → AnalysisResult (validated)
```

Each arrow is a real dependency: a stage only receives the context fields
it actually declared in its input type (not the entire accumulated blob),
so what a stage depends on is visible by reading its own file, not by
tracing the whole pipeline. Stages run **sequentially, not in parallel**,
because each one (after the first) needs at least one field a prior stage
produced — see "Future Extension Points" for where this could change.

Ten of the eleven stages call the model (via the same shared
`lib/services/openai.ts` entry point, `runChatCompletion`) with their own
narrow prompt and validate their own response with a small, per-stage Zod
schema before returning. The eleventh stage, Final Report Assembly, does
not call the model at all — it validates that the accumulated context is
now complete and hands back the same `AnalysisResult` shape the app has
always used.

---

## Stage Responsibilities

| # | Stage | Module | Calls OpenAI? | Produces |
|---|---|---|---|---|
| 1 | Idea Analysis | `stages/ideaAnalysis.ts` | Yes | `idea`, `summary` |
| 2 | Problem Analysis | `stages/problemAnalysis.ts` | Yes | `problem`, `solution` |
| 3 | Market Analysis | `stages/marketAnalysis.ts` | Yes | `market_size` |
| 4 | Customer Analysis | `stages/customerAnalysis.ts` | Yes | `customers` |
| 5 | Competition Analysis | `stages/competitionAnalysis.ts` | Yes | `competition` |
| 6 | Business Model Analysis | `stages/businessModelAnalysis.ts` | Yes | `business_model` |
| 7 | Risk Analysis | `stages/riskAnalysis.ts` | Yes | `risks` |
| 8 | Opportunity Analysis | `stages/opportunityAnalysis.ts` | Yes | `opportunities` |
| 9 | Execution Roadmap | `stages/executionRoadmap.ts` | Yes | `next_steps` |
| 10 | Investment Scoring | `stages/investmentScoring.ts` | Yes | `score`, `verdict`, `investment_decision`, `confidence`, `strengths`, `weaknesses`, sub-scores |
| 11 | Final Report Assembly | `stages/finalReportAssembly.ts` | No | validated `AnalysisResult` |

A design decision worth calling out: the original single-prompt system
produced `problem` and `solution` as two separate top-level fields with no
explicit ordering between them. This pipeline pairs them in one stage
(Problem Analysis) rather than giving `solution` its own stage, because a
proposed solution only makes sense as a direct response to a stated
problem — generating them separately risked a solution stage answering a
problem statement it never saw. Business Model Analysis (stage 6) then
builds on both.

Each stage module exports exactly three things, per the required contract:

```ts
export interface <Stage>Input { /* only the fields this stage needs */ }
export type <Stage>Output = z.infer<typeof <Stage>OutputSchema>;
export async function analyze(input: <Stage>Input): Promise<<Stage>Output>;
```

---

## Folder Structure

```
lib/analysis/
  types/
    context.ts       PipelineContext — Partial<AnalysisResult> & { idea }
    stage.ts         AnalysisStageFn<TInput, TOutput> — documents the
                      analyze() contract every stage follows
  prompts/
    shared.ts         ATLAS_PERSONA + buildContextBlock() — shared voice
                        and "here's what we know so far" formatting
    ideaAnalysis.prompt.ts
    problemAnalysis.prompt.ts
    marketAnalysis.prompt.ts
    customerAnalysis.prompt.ts
    competitionAnalysis.prompt.ts
    businessModelAnalysis.prompt.ts
    riskAnalysis.prompt.ts
    opportunityAnalysis.prompt.ts
    executionRoadmap.prompt.ts
    investmentScoring.prompt.ts
                      (no prompt file for Final Report Assembly — it
                       never calls the model)
  stages/
    ideaAnalysis.ts
    problemAnalysis.ts
    marketAnalysis.ts
    customerAnalysis.ts
    competitionAnalysis.ts
    businessModelAnalysis.ts
    riskAnalysis.ts
    opportunityAnalysis.ts
    executionRoadmap.ts
    investmentScoring.ts
    finalReportAssembly.ts
  scoring/
    scoring.ts        clampScore, averageScores, deriveOverallScore,
                        deriveVerdict — pure, reusable scoring helpers
  mappers/
    reportAssembler.ts  assembleFinalReport() — the reusable report
                          assembler, called by the Final Report Assembly
                          stage
  pipeline/
    runAnalysisPipeline.ts   the orchestrator
  index.ts             public entry point: runAnalysisPipeline +
                        shared pipeline types
```

This mirrors the folder rules in `CLAUDE.md` Section 4: prompts are never
hardcoded inside a stage or a service, business logic (each stage, the
orchestrator) contains no React/Next.js imports, and shapes shared across
stages (`PipelineContext`) are defined once and derived from the existing
`AnalysisResultSchema` rather than hand-duplicated.

---

## ASCII Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     runAnalysisPipeline(idea)                         │
│                     lib/analysis/pipeline/                             │
│                                                                          │
│  context = { idea }                                                     │
│                                                                          │
│  ┌────────────────────┐   each stage:                                   │
│  │ 1. Idea Analysis    │   1. reads only the context fields it needs    │
│  ├────────────────────┤   2. builds its prompt (lib/analysis/prompts/)  │
│  │ 2. Problem Analysis │   3. calls runChatCompletion()                 │
│  ├────────────────────┤      (lib/services/openai.ts — shared client)   │
│  │ 3. Market Analysis   │  4. validates its own JSON response           │
│  ├────────────────────┤      (per-stage Zod schema + parseOrThrow)      │
│  │ 4. Customer Analysis │  5. returns a typed Output                    │
│  ├────────────────────┤   6. orchestrator merges Output into context    │
│  │ 5. Competition        │                                              │
│  │    Analysis           │        context = { ...context, ...output }   │
│  ├────────────────────┤                                                 │
│  │ 6. Business Model     │                                              │
│  │    Analysis           │                                              │
│  ├────────────────────┤                                                 │
│  │ 7. Risk Analysis      │                                              │
│  ├────────────────────┤                                                 │
│  │ 8. Opportunity        │                                              │
│  │    Analysis           │                                              │
│  ├────────────────────┤                                                 │
│  │ 9. Execution Roadmap  │                                              │
│  ├────────────────────┤                                                 │
│  │ 10. Investment        │  uses lib/analysis/scoring/ to clamp scores  │
│  │     Scoring           │  and derive a fallback overall score          │
│  ├────────────────────┤                                                 │
│  │ 11. Final Report      │  lib/analysis/mappers/reportAssembler.ts     │
│  │     Assembly          │  validates the complete context against       │
│  │  (no OpenAI call)     │  AnalysisResultSchema, no model call          │
│  └────────┬───────────┘                                                 │
│           │                                                              │
│           ▼                                                              │
│    AnalysisResult   ── identical shape to today's single-call output ──▶ │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              (not yet connected — see Cutover status)
                              │
                              ▼
                 app/api/chat/route.ts  (unchanged, still calls
                 lib/services/analysis.ts's single-call analyzeStartup)
```

---

## Cutover Status

`app/api/chat/route.ts`, `lib/services/analysis.ts`, and every UI component
are **unchanged**. The live app still makes exactly one OpenAI call per
analysis, exactly as it did before this pipeline existed. This was a
deliberate choice, not an oversight: running all eleven stages for real
means roughly eleven sequential OpenAI calls instead of one, which is a
real latency and cost change (many times slower and more expensive per
request) that deserves its own explicit decision rather than shipping
silently as a side effect of an architecture milestone.

Cutting over is a small, contained change when it's decided: swap
`analyzeStartup(idea)` for `runAnalysisPipeline(idea)` in
`lib/services/analysis.ts` (or call `runAnalysisPipeline` directly from the
route) — both return the same `AnalysisResult` type, validated the same
way, so nothing downstream needs to change. Before that happens, it's
worth deciding whether all eleven stages should run sequentially and
synchronously within one request (simple, but slow), or whether the route
should return quickly and stream/poll for stage-by-stage progress (better
UX, more work) — see Milestone 6 in `CLAUDE.md`'s roadmap (streaming) for
related groundwork.

---

## Future Extension Points

- **Independent AI agents per stage.** Every stage already calls
  `runChatCompletion` with its own prompt and validates its own response
  independently — the only thing making them "the same OpenAI service"
  today is that they all call the same function in
  `lib/services/openai.ts`. Swapping an individual stage to a different
  model, a different provider, or a genuinely separate agent process only
  requires changing that one stage's `analyze()` implementation; its
  `Input`/`Output` types and its place in the orchestrator don't change.
- **Parallelizing independent stages.** Risk Analysis and Opportunity
  Analysis both currently run sequentially after Execution-Roadmap's
  dependencies are ready, but neither depends on the other's output — they
  could run concurrently (`Promise.all`) once there's a measured reason to
  (Section 15 of `CLAUDE.md`: don't optimize before it's needed). The
  orchestrator's shape (read context, call stage, merge output) doesn't
  need to change to support this — only the specific sequencing does.
  Customer Analysis and a hypothetical future stage that also only depends
  on Market Analysis would be another parallelizable pair.
- **Retry and partial-failure handling.** Today, any stage throwing
  `ExternalServiceError` or `ValidationError` fails the whole pipeline (the
  orchestrator has no try/catch of its own — errors propagate to whatever
  calls `runAnalysisPipeline`). A future milestone could add per-stage
  retry with backoff, or a policy for which stages are allowed to fail
  without failing the whole analysis (e.g., a missing Opportunity Analysis
  might be acceptable; a missing Investment Scoring is not).
  
- **Streaming stage-by-stage progress to the client.** Because the
  pipeline is already decomposed into discrete, independently-completing
  stages, it's a natural fit for a future streaming API (each stage's
  completion becomes a progress event) — see Milestone 6 in `CLAUDE.md`.
- **New stages.** A new stage (e.g. a dedicated "Go-to-Market Analysis")
  follows the same pattern: a prompt builder in `prompts/`, a stage module
  in `stages/` with its own Input/Output/analyze(), a slot in the
  orchestrator reading whatever context fields it needs, and — if it adds
  a new field to the final report — an addition to `AnalysisResultSchema`
  as an **optional** field first (per `CLAUDE.md`'s "schema-first, additive
  evolution" rule), so nothing existing breaks while the new stage is
  adopted.
- **Reusing stages outside the full pipeline.** Because every stage is a
  plain function with its own typed input/output, nothing prevents calling
  a single stage in isolation (e.g. a future "just re-run Risk Analysis for
  this existing project" feature) without running the other ten.

---

## What Did Not Change

- `app/api/chat/route.ts` — unchanged.
- `lib/services/analysis.ts` (`analyzeStartup`) — unchanged, still the
  live path.
- Every UI component, route, and page — unchanged.
- `lib/schemas/analysis.ts` (`AnalysisResultSchema`) — unchanged; it's the
  shared contract both the old single-call path and the new pipeline
  validate against.

The only modification to an existing file is `lib/services/openai.ts`,
which had its OpenAI-calling logic extracted into a new, generic
`runChatCompletion(systemPrompt, userPrompt)` function; the existing
`generateStartupAnalysis(idea)` now calls that function internally but
keeps its exact prior signature and behavior. This is what "all stages may
internally call the same OpenAI service" means concretely: the pipeline's
ten model-calling stages and the legacy single-call path both go through
the same underlying client and error handling.
