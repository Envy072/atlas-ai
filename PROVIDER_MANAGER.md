# Atlas AI — Provider Manager

Milestone 5: Multi-Provider Research Integration. This document explains
`lib/research/manager/` — the layer introduced this milestone that sits
between the orchestrator and the individual providers, and describes how
`lib/research/providers/tavilyProvider.ts` and `braveProvider.ts` became
real (Milestone 4 shipped them, and every other provider, as typed
placeholders — see `RESEARCH_ENGINE.md`).

**Core principle, restated:** every provider is replaceable, and no
provider-specific logic leaks outside the provider layer. The
orchestrator (`lib/research/orchestrator/researchOrchestrator.ts`) no
longer imports or calls a provider directly — it calls
`searchViaProviderManager()`, and would behave identically if Tavily were
swapped for a different primary search provider tomorrow.

---

## What Changed From Milestone 4

- `lib/research/orchestrator/researchOrchestrator.ts` now calls
  `searchViaProviderManager()` (new, in `manager/`) instead of calling
  `selectProviders()` + each provider's `search()` directly. The old
  `providerSelector.ts` is kept, unused, rather than deleted (this
  project's standing practice — see `CLAUDE.md`).
- `braveProvider.ts` — rewritten from a Milestone 4 placeholder into a
  real Brave Search API client.
- `tavilyProvider.ts` — new; a real Tavily API client, and now the
  registered `tavily` entry in `providers/registry.ts`.
- `schemas/source.schema.ts` — `Source` gained a required `confidence`
  field (additive; safe because no provider had ever constructed a real
  `Source` object before this milestone).
- `schemas/enums.ts` — `ProviderResultStatus` gained `"timeout"` and
  `"not_configured"` (additive; nothing exhaustively switches over the
  old 3-value set).
- `schemas/researchResult.schema.ts` — `ResearchResult` gained
  `providerSummary`, `sourceSummary`, `searchStatistics` (additive;
  nothing outside `lib/research/` constructs or reads a `ResearchResult`
  yet, so there was no existing consumer to break).

Everything else from Milestone 4 (ranking, evidence builders, cache,
utils, the remaining 5 placeholder providers) is unchanged.

---

## Provider Lifecycle

```
runResearch(request)
  │
  └─ searchViaProviderManager(query, { providerIds })
        │
        ├─ Split candidate providers into:
        │     - members of a fallback chain (today: tavily, brave — both
        │       "search_engine" providers, see fallbackChains.ts)
        │     - independent providers (google, reddit, crunchbase,
        │       github, news — not substitutes for one another)
        │
        ├─ For each fallback chain: runFallbackChain() — try providers in
        │    priority order, stop at the first usable result
        │
        ├─ For each independent provider: callProviderWithRetry() directly,
        │    in parallel with every chain and every other independent provider
        │
        └─ For every provider call, regardless of path:
              1. callProviderOnce() races provider.search() against an
                 outer timeout ceiling (10s default — see Retry Strategy)
              2. the outcome's status/latency/sourceCount is recorded via
                 recordAttempt() (metrics.ts) — except "not_configured"/
                 "not_implemented", which never attempted a real call (see
                 Metrics below for why that distinction matters)
              3. computeHealth() derives the provider's current health
                 from its accumulated metrics
```

A single provider call therefore always produces a `ManagedProviderResult`
— the raw `ProviderResult`, the provider's health *as of that call*, and
whether this attempt was a fallback (i.e., not the first provider tried
in its chain).

---

## Fallback Strategy

`manager/fallbackChains.ts` maps a source-type "role" to an ordered list
of provider ids:

```ts
export const FALLBACK_CHAINS = {
  search_engine: ["tavily", "brave"],
};
```

`runFallbackChain()` tries each id in order, calling
`callProviderWithRetry()` for each, and stops the moment a result is
**usable**:

```ts
function isUsableResult(outcome) {
  return outcome.result.status === "ok"
    && outcome.result.sources.length > 0
    && outcome.health !== "offline";
}
```

So Brave activates automatically in exactly the cases Step 3 specified:
Tavily errors, times out, returns zero sources, or isn't configured
(`TAVILY_API_KEY` unset) — all of these fail the `isUsableResult` check
and the chain moves on. If Brave also isn't usable, the chain is
exhausted and **both** attempted outcomes are still returned (not
discarded) — the caller sees an honest trail of what was tried, not a
silent gap. This was verified at runtime this milestone (see
Verification): with no API keys configured, both `tavily` and `brave`
report `not_configured`, and `brave`'s `ProviderSummary.usedAsFallback`
is correctly `true`.

Adding a second fallback pair later (e.g. a future second news provider)
is one array entry in `fallbackChains.ts` — nothing in
`providerManager.ts` needs to change.

---

## Retry Strategy

Two independent layers, deliberately not merged into one:

1. **Provider-internal** (`lib/research/utils/httpRequest.ts`'s
   `fetchWithRetry`, used by Tavily/Brave themselves): a single HTTP call
   protected by `AbortController` (8s default timeout) with up to 2
   retries and exponential backoff (300ms, 600ms), retrying only on 5xx/
   429 responses or a network-level throw — a 4xx means the request
   itself is wrong, and retrying it unchanged wouldn't help.
2. **ProviderManager-level** (`manager/providerManager.ts`'s
   `callProviderWithRetry`): treats an entire provider call as one unit
   and retries it (default: 1 additional attempt, 400ms base backoff,
   doubling) only when the outcome is `"error"` or `"timeout"` — never
   for `"not_configured"`/`"not_implemented"`, since retrying a
   structurally-guaranteed-identical outcome would just waste a full
   timeout window for nothing.

`callProviderOnce()` additionally races every provider call against its
own 10-second outer ceiling (`DEFAULT_RETRY_POLICY.timeoutMs`) — a
defensive backstop above whatever the provider does internally, in case a
provider hangs longer than its own internal timeout due to a bug. This
race does not cancel the provider's own in-flight request (the
`ResearchProvider.search()` contract has no cancellation signal — see
Future Providers below for why that wasn't added this milestone); it
guarantees only that ProviderManager itself never waits past the ceiling
for an answer.

---

## Metrics

`manager/metrics.ts` tracks, per provider, exactly what Step 4 asked for:

```ts
interface ProviderMetricsSnapshot {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  totalSourceCount: number;
  lastLatencyMs: number | null;
  averageLatencyMs: number | null;
  lastSuccessfulRequestAt: string | null;
}
```

An in-process `Map`, the same pattern `cache/memoryCache.ts` already
uses — resets on server restart; a multi-instance production deployment
would eventually want this backed by something shared, exactly the
scaling story `cache/` already anticipates with its Redis/database
placeholders.

**A bug caught and fixed during this milestone's own verification:**
`not_configured`/`not_implemented` outcomes were initially recorded like
any other attempt, which meant `totalRequests` climbed without
`successCount`/`failureCount`/`timeoutCount` ever moving — a provider
that has *never* actually run would report a 0% failure rate and be
misjudged `"healthy"` forever. `callProviderOnce()` now only calls
`recordAttempt()` for `"ok"`/`"error"`/`"timeout"` outcomes — a
`not_configured` provider correctly stays at zero recorded attempts
(and therefore `"healthy"` by the "not enough history to judge" rule,
which is the honest default: there's no evidence against it, only an
absence of any attempt at all).

---

## Health System

`manager/health.ts`'s `computeHealth()` is a pure function from a metrics
snapshot to one of three states:

| Health | Condition |
|---|---|
| `healthy` | Fewer than 3 recorded attempts (not enough history to judge), or a failure+timeout rate below 30% |
| `degraded` | Failure+timeout rate between 30% and 80% |
| `offline` | Failure+timeout rate 80% or higher |

`ProviderManager` uses this in exactly one place today —
`isUsableResult()` treats an `"offline"` result as unusable even if its
status happens to be `"ok"` with sources (a provider that's mostly been
failing shouldn't be trusted just because this one attempt happened to
work) — but the computed health is also surfaced on every
`ProviderSummary` entry in the final `ResearchResult`, so a future
consumer (a monitoring dashboard, an alert) has it without recomputing
anything.

All three thresholds were verified directly against synthetic metrics
snapshots this milestone (10%/40%/90% failure rates producing
healthy/degraded/offline respectively) — see Verification.

---

## Evidence (Step 7)

`researchOrchestrator.ts` now builds one `Evidence` per ranked source:

```ts
buildEvidence({
  claim: source.title,
  evidence: source.snippet ?? source.title,
  confidence: source.confidence,
  source,
});
```

Every `Source` (and therefore every `Evidence` built from one) is
guaranteed by the schema to carry `title`, `url`, `providerId`, and
`retrievedAt` — and now `confidence` too. For Tavily, that confidence is
the API's own real per-result relevance score (0-1, mapped to 0-100) —
genuine provider data, not fabricated. Brave's API doesn't return an
equivalent per-result score, so its confidence is an explicitly-documented
position-based heuristic (earlier results presumed more relevant, decaying
by rank) — the distinction is called out in `braveProvider.ts`'s own
comments so nobody mistakes it for a real API-supplied signal the way
Tavily's is.

The "claim" is intentionally the source's own title — a research-stage
claim ("this source exists and is about X"), not an analysis-stage one.
A future pipeline stage that consumes this evidence would build its own,
more specific claims (e.g. "the market is growing") and cite the
supporting `Evidence` via `buildCitation()`, unchanged from Milestone 4.

---

## Research Report Additions (Step 8)

`ResearchResult` gained three fields, all additive:

- **`providerSummary`** — one entry per provider actually attempted:
  status, health, source count, latency, and whether it ran as a
  fallback.
- **`sourceSummary`** — aggregate facts about the final ranked list:
  total sources, unique domains, average confidence, and a breakdown by
  source type.
- **`searchStatistics`** — request-level numbers: providers queried/
  succeeded/failed, total latency, and whether any fallback was
  triggered.

Nothing outside `lib/research/` reads a `ResearchResult` yet, so "without
changing existing consumers" was automatically satisfied — there were
none to change.

---

## Future Providers

Adding a seventh real provider (Bing, a company-website scraper, a
government-dataset API) follows the exact shape Tavily/Brave established:

1. A new file in `providers/`, implementing `ResearchProvider`, using
   `fetchWithRetry` for its HTTP call, reading its credential from
   `process.env`, mapping its response into `Source[]` with a real or
   clearly-documented-heuristic `confidence`, and never including its
   credential in any error message.
2. One line in `providers/registry.ts`.
3. If it should participate in a fallback relationship with an existing
   provider, one array entry in `fallbackChains.ts` — nothing else.

**Known limitation, deliberately not addressed this milestone:**
`ResearchProvider.search()` has no cancellation signal, so
ProviderManager's outer timeout ceiling can give up waiting on a
provider without actually stopping its in-flight request. Extending the
interface to accept an optional `AbortSignal` (additive — existing
providers ignoring it would still compile and work exactly as they do
now) is the natural next step once a provider that's actually slow enough
to matter is added.

---

## Verification

- `tsc --noEmit`: clean.
- `eslint lib/research`: clean (0 errors, 0 warnings).
- `npm run build`: succeeds.
- **Runtime verification** (a temporary scratch page, exercised through
  the live dev server, then removed before completion): 11/11 checks
  passed, including — Tavily and Brave both correctly report
  `not_configured` with no API keys present; the fallback chain runs both
  members and correctly marks Brave's attempt `usedAsFallback: true` when
  the chain is exhausted; the five untouched placeholder providers still
  run alongside the chain; `ResearchResult` carries valid
  `providerSummary`/`sourceSummary`/`searchStatistics`; `not_configured`
  attempts are confirmed **not** recorded in metrics (the bug described
  above, verified fixed); a scoped `providerIds` call touches only the
  requested providers; and `computeHealth()` correctly returns
  healthy/degraded/offline at 10%/40%/90% synthetic failure rates.
- **Not verified:** an actual authenticated round-trip against the real
  Tavily or Brave APIs. No `TAVILY_API_KEY`/`BRAVE_API_KEY` exists in this
  environment (both were added to `.env.local` as empty placeholders,
  matching the existing convention). The request/response shapes in
  `tavilyProvider.ts`/`braveProvider.ts` are implemented against each
  provider's public API documentation, but have not been exercised
  against a live, authenticated response. This should be the first thing
  confirmed once a real key is available.
