# Atlas AI — Research Intelligence Engine

Milestone 4, Phase 1: architecture and infrastructure only. This document
describes `lib/research/` — a standalone module that will eventually let
Atlas AI gather real evidence (search results, competitor data, news,
code activity) before running an analysis, instead of relying purely on
the model's own knowledge.

**Status: not wired into the application.** Nothing in `lib/analysis/`,
`lib/services/`, `app/api/`, `lib/store/`, or `lib/schemas/` imports from
`lib/research/` — those five paths are frozen this milestone and remain
completely unchanged. `lib/research/` is free-standing, real, and
independently verified (see "Verification" below), waiting for a future
milestone to decide how it plugs into the existing Analysis Pipeline.

---

## Why This Exists

Today, `lib/analysis/`'s pipeline stages (see `PIPELINE.md`) each ask the
model to reason about market size, competition, risk, etc. purely from
its own training knowledge — there's no step where Atlas AI actually
looks anything up. That's a real limitation: the model can't know about
last week's funding announcement, a competitor's current pricing, or what
real people are saying on Reddit about a problem space.

The Research Engine exists to close that gap — a place to gather real,
sourced evidence *before* analysis happens, so a future pipeline stage
could say "here's what Google/Reddit/Crunchbase/GitHub actually say about
this" instead of "here's what the model guesses." This phase builds the
architecture that makes that possible without yet making a single real
external request.

---

## Architecture

Six layers, deliberately mirroring the layering conventions already
established by `lib/services/` and `lib/analysis/` (plain functions,
one typed contract per concern, Zod validation at every boundary):

```
┌──────────────────────────────────────────────────────────┐
│ Providers (lib/research/providers/)                        │
│  One module per external source. Every provider implements  │
│  the same ResearchProvider interface. Today: typed            │
│  placeholders, zero network calls.                             │
├──────────────────────────────────────────────────────────┤
│ Orchestrator (lib/research/orchestrator/)                        │
│  Selects providers, fans a request out to all of them in           │
│  parallel, merges what comes back.                                   │
├──────────────────────────────────────────────────────────┤
│ Utils (lib/research/utils/) — real, working                            │
│  Deduplication, URL/query normalization, ranking-input                   │
│  preparation, citation formatting. No external dependency needed,          │
│  so unlike providers/ranking, these are genuinely implemented today.        │
├──────────────────────────────────────────────────────────┤
│ Ranking (lib/research/ranking/)                                              │
│  Scores every deduplicated source on five dimensions and sorts by             │
│  the result. The composition/sorting is real; the individual factor            │
│  scores are neutral placeholders (see "Ranking Model" below).                    │
├──────────────────────────────────────────────────────────┤
│ Evidence (lib/research/evidence/)                                                 │
│  Builders that turn a Source into a schema-valid Evidence/Citation,                  │
│  the shape any future AI claim must be backed by.                                     │
├──────────────────────────────────────────────────────────┤
│ Cache (lib/research/cache/)                                                              │
│  One interface, three backends: a real in-memory implementation today,                     │
│  Redis/database implementations stubbed for later.                                           │
└──────────────────────────────────────────────────────────┘
```

`types/` and `schemas/` aren't a seventh/eighth layer so much as the
foundation the six above are built on — see "Types vs. Schemas" below.

---

## Folder Structure

```
lib/research/
  index.ts                    public entry point (not consumed anywhere yet)

  schemas/                    Zod schemas — the validated data shapes
    enums.ts                    ProviderId, SourceType, ProviderResultStatus
    source.schema.ts              Source
    evidence.schema.ts              Evidence
    citation.schema.ts                Citation
    providerResult.schema.ts            ProviderResult
    researchRequest.schema.ts             ResearchRequest
    researchResult.schema.ts                ResearchResult
    ranking.schema.ts                        RankingFactors, RankedSource
    index.ts                                   barrel

  types/                      behavioral contracts — not validated data
    provider.ts                  ResearchProvider interface, ProviderQuery
    ranking.ts                     RankingContext
    cache.ts                         ResearchCache interface, CacheEntry
    index.ts                           barrel

  providers/                  one module per external source
    googleProvider.ts, braveProvider.ts, redditProvider.ts,
    crunchbaseProvider.ts, githubProvider.ts, newsProvider.ts
    notImplementedResult.ts      shared placeholder-result builder
    registry.ts                    PROVIDER_REGISTRY, getRegisteredProviders(), getProviderById()
    index.ts

  orchestrator/
    researchOrchestrator.ts      runResearch() — the main entry point
    providerSelector.ts            selectProviders()
    index.ts

  ranking/
    factors.ts                   the 5 scoring functions (placeholders)
    rankingEngine.ts               rankSources() (real composition/sort)
    index.ts

  evidence/
    evidenceBuilder.ts            buildEvidence()
    citationBuilder.ts              buildCitation()
    index.ts

  cache/
    memoryCache.ts                 MemoryResearchCache (real)
    redisCache.ts                    RedisResearchCache (placeholder)
    databaseCache.ts                   DatabaseResearchCache (placeholder)
    createCache.ts                       factory
    index.ts

  utils/
    normalization.ts               normalizeUrl, extractDomain, normalizeQuery
    deduplication.ts                 dedupeSources
    rankingPreparation.ts              getSourceAgeInDays, getTopicOverlapRatio
    sourceFormatting.ts                  formatSourceCitation
    index.ts
```

### Types vs. Schemas

A shape lives in `schemas/` (Zod, with the TypeScript type inferred via
`z.infer<>`) when it crosses a boundary and needs runtime validation —
`Source`, `Evidence`, `Citation`, `ProviderResult`, `ResearchRequest`,
`ResearchResult`, `RankedSource`. A shape lives in `types/` as a plain
TypeScript interface when it's a *behavioral contract* (what a function
must implement) or a computation-only helper type never itself
validated — `ResearchProvider`, `ResearchCache`, `RankingContext`. This
mirrors the existing convention in `lib/schemas/analysis.ts` (one schema,
one inferred type, no hand-duplicated interface) rather than inventing a
new pattern.

---

## Flow

```
runResearch({ topic, providers?, maxResultsPerProvider?, freshnessWindowDays? })
  │
  ├─ 1. Validate the request (ResearchRequestSchema, via lib/validation/parse.ts)
  │
  ├─ 2. selectProviders(providers?)
  │       — an explicit list (ids not yet registered are silently skipped,
  │         not an error) or every registered provider
  │
  ├─ 3. Call every selected provider's search() in parallel
  │       — each call is wrapped so a thrown error becomes a
  │         status: "error" ProviderResult instead of failing the whole
  │         request; a provider that hasn't been implemented yet returns
  │         status: "not_implemented" (today, that's all six of them)
  │
  ├─ 4. Merge every ProviderResult.sources into one array
  │
  ├─ 5. dedupeSources() — collapse duplicates by normalized URL
  │
  ├─ 6. rankSources() — score + sort (see "Ranking Model")
  │
  └─ 7. Assemble and validate a ResearchResult
          (request, ranked sources, evidence: [], every ProviderResult, generatedAt)
```

Today, since every provider is a placeholder, this whole flow runs for
real (parallel calls happen, merging/deduping/ranking logic executes) and
correctly produces a `ResearchResult` with an **empty** `sources` array —
not a fake one. See "Verification" for how this was confirmed at runtime,
not just type-checked.

---

## Provider Model

Every provider — real or placeholder — implements exactly one interface:

```ts
interface ResearchProvider {
  id: ProviderId;
  name: string;
  sourceType: SourceType;
  search(query: ProviderQuery): Promise<ProviderResult>;
}
```

The six implemented this phase (`googleProvider`, `braveProvider`,
`redditProvider`, `crunchbaseProvider`, `githubProvider`, `newsProvider`)
each return `buildNotImplementedResult(...)` — zero sources, `status:
"not_implemented"`, a real (if trivially small) `tookMs` measurement.
`status` is what makes this honest rather than silently empty: a future
consumer can tell "not implemented" apart from "ran for real and found
nothing" or "errored," which a bare empty array could never distinguish.

`ProviderId` already includes `tavily`, `bing`, `company_website`, and
`government_dataset` — the remaining four sources from the milestone's
goal list — even though no provider *module* exists for them yet. Adding
one later means writing a file identical in shape to `googleProvider.ts`
and adding one line to `providers/registry.ts`; nothing else in the
system needs to change, including the orchestrator, the ranking engine,
or any future pipeline integration.

---

## Evidence Model

```ts
interface Evidence {
  id: string;
  claim: string;       // what's being asserted
  evidence: string;     // the supporting text/quote
  confidence: number;    // 0-100
  source: Source;          // full provenance, not just a URL string
  url: string;
  retrievedAt: string;
}

interface Citation {
  id: string;
  claim: string;
  evidenceIds: string[]; // one claim can cite several pieces of evidence
  confidence: number;     // the *lowest* confidence among cited evidence
}
```

`buildEvidence()` and `buildCitation()` are the only place these get
constructed, both validating their output against the schema before
returning it (reusing `lib/validation/parse.ts`, unchanged from Sprint 3)
— so nothing downstream ever has to defensively check whether an Evidence
object is well-formed.

---

## Ranking Model

Five dimensions, each 0-100, combined into one weighted score:

| Factor | Weight | What it will eventually measure |
|---|---|---|
| Relevance | 30% | How well a source matches the research topic |
| Trust | 25% | Source-type and domain reputation |
| Authority | 20% | Domain authority / known-publisher status |
| Freshness | 15% | How recently the source was published |
| Source Quality | 10% | Content depth/structure heuristics |

**What's real today:** the weights, the composition formula, the
sorting, and the full `RankedSource` type (a `Source` plus its `score`
and per-factor `factors` breakdown) — all genuinely functional, verified
against a real (non-empty) input during this milestone's verification
pass, not just against the always-empty orchestrator path.

**What's a placeholder today:** the five `score*` functions in
`ranking/factors.ts` each return a fixed 50/100. This is explicit by
design (this milestone's rule: "design scoring... no implementation of
algorithms yet") and is honest rather than fake specifically because
nothing currently treats these numbers as real signal — no provider
returns real sources, so `rankSources()` only ever ranks an empty list in
the live orchestrator flow. `lib/research/utils/rankingPreparation.ts`
already provides real, working derivations (`getSourceAgeInDays`,
`getTopicOverlapRatio`) that a future implementation of `scoreFreshness`/
`scoreRelevance` would build on — the raw ingredients exist; the recipe
(what to do with them, what "authority" means for a given domain, etc.)
does not yet.

---

## Cache Model

```ts
interface ResearchCache {
  get<TValue>(key: string): Promise<CacheEntry<TValue> | null>;
  set<TValue>(key: string, value: TValue, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

`MemoryResearchCache` is a genuine, working implementation (an in-process
`Map` with TTL expiry) — no external dependency needed for that to be
real rather than a stub, so it isn't one. `RedisResearchCache` and
`DatabaseResearchCache` conform to the same interface but every method
throws a clear "architecture only" error, per this milestone's explicit
rule ("Do NOT implement Redis"). `createCache({ backend })` is the single
factory a caller depends on; switching the default backend in production
later is a one-line change there, not a rewrite of anything that already
uses the cache.

---

## Future Integration Plan

None of this is wired into the application yet. In rough order:

1. **Decide the integration point.** Most likely: a new pipeline stage
   (following the exact shape of `lib/analysis/stages/*` — its own
   `Input`/`Output` types, its own `analyze()` function) that calls
   `runResearch()` before or alongside the existing Market/Competition
   Analysis stages, and folds the resulting `Evidence[]` into the
   pipeline context.
2. **Implement one real provider first** (Brave or Tavily are the
   simplest — a single API key, one HTTP call) to prove the contract end
   to end, before implementing the rest.
3. **Implement the ranking factors for real**, using
   `rankingPreparation.ts`'s existing helpers as a starting point.
4. **Decide the cache backend for production** (Redis is the likely
   choice for a multi-instance deploy) and implement `RedisResearchCache`
   for real.
5. **Wire Evidence into the pipeline's output**, likely by extending
   `AnalysisResultSchema` (in the currently-frozen `lib/schemas/`) with an
   optional `citations`/`evidence` field — additive, per this project's
   "schema-first, additive evolution" principle (`CLAUDE.md`), so nothing
   existing breaks when it lands.
6. **Surface citations in the UI** — the Milestone 3 report sections
   (`components/workspace/report/`) already have a `ReportActions`
   toolbar and a section-based layout that a "Sources" section or inline
   citation markers would slot into naturally.

None of this is scheduled to a specific milestone yet — it's the logical
next-steps list, not a commitment.

---

## Verification

- `tsc --noEmit`: clean.
- `eslint lib/research`: clean (0 errors, 0 warnings — a handful of
  intentionally-unused parameters in placeholder functions were resolved
  with explicit `void` references rather than left as lint noise).
- `npm run build`: succeeds.
- **Runtime verification** (beyond type-checking): a temporary scratch
  page (not part of this deliverable, removed before completion) actually
  called `runResearch()`, `rankSources()`, `buildEvidence()`,
  `buildCitation()`, `dedupeSources()`, `normalizeUrl()`, and a real
  `MemoryResearchCache` round-trip through the running dev server —
  exercising real module resolution and real execution, not just
  compilation. All 8 checks passed: 6 providers ran and reported
  `not_implemented`, the orchestrator correctly filtered an unregistered
  provider id out of an explicit selection, URL normalization/dedup
  collapsed a tracking-parameter variant, ranking produced a valid
  clamped score, citation-to-evidence linking was correct, and the memory
  cache round-tripped a real value.

## What Was Not Touched

`lib/analysis/`, `lib/services/`, `app/api/`, `lib/store/`,
`lib/schemas/` — zero changes, confirmed via `git status` showing no
modifications under any of those five paths.
