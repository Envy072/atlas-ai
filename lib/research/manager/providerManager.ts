import type { ResearchProvider, ProviderQuery } from "@/lib/research/types/provider";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { ProviderHealth } from "@/lib/research/schemas/health.schema";
import type { ProviderId } from "@/lib/research/schemas/enums";
import type { RetryPolicy } from "@/lib/research/manager/types";
import { getProviderById, getRegisteredProviders } from "@/lib/research/providers/registry";
import { recordAttempt, getMetricsSnapshot } from "@/lib/research/manager/metrics";
import { computeHealth } from "@/lib/research/manager/health";
import { DEFAULT_RETRY_POLICY } from "@/lib/research/manager/retryPolicy";
import { FALLBACK_CHAINS } from "@/lib/research/manager/fallbackChains";

export interface ManagedProviderResult {
  result: ProviderResult;
  health: ProviderHealth;
  usedAsFallback: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTimeoutResult(providerId: ProviderId, topic: string, startedAt: number, timeoutMs: number): ProviderResult {
  return {
    providerId,
    query: topic,
    status: "timeout",
    sources: [],
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    error: `ProviderManager timeout ceiling (${timeoutMs}ms) exceeded.`,
  };
}

function buildErrorResult(providerId: ProviderId, topic: string, startedAt: number, error: unknown): ProviderResult {
  return {
    providerId,
    query: topic,
    status: "error",
    sources: [],
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    error: error instanceof Error ? error.message : "Unknown provider error.",
  };
}

// One call, one metrics record. The outer race is a defensive ceiling
// above whatever the provider does internally (Tavily/Brave each already
// have their own ~8s internal timeout) — it does not cancel the
// provider's own in-flight request, but it guarantees ProviderManager
// itself never waits past `policy.timeoutMs` for an answer.
async function callProviderOnce(
  provider: ResearchProvider,
  query: ProviderQuery,
  policy: RetryPolicy
): Promise<ManagedProviderResult> {
  const startedAt = Date.now();

  const timeoutPromise = new Promise<ProviderResult>((resolve) => {
    setTimeout(
      () => resolve(buildTimeoutResult(provider.id, query.topic, startedAt, policy.timeoutMs)),
      policy.timeoutMs
    );
  });

  let result: ProviderResult;

  try {
    result = await Promise.race([provider.search(query), timeoutPromise]);
  } catch (error) {
    result = buildErrorResult(provider.id, query.topic, startedAt, error);
  }

  // "not_configured"/"not_implemented" never actually attempted a
  // network call — recording them would silently dilute the failure
  // rate computeHealth() relies on (totalRequests would climb with
  // neither a success nor a failure to show for it), making a provider
  // that has *never* run look identical to one that's healthy. Only
  // genuine attempts count toward metrics/health.
  if (result.status === "ok" || result.status === "error" || result.status === "timeout") {
    recordAttempt({
      providerId: provider.id,
      status: result.status,
      latencyMs: result.tookMs,
      sourceCount: result.sources.length,
    });
  }

  return {
    result,
    health: computeHealth(getMetricsSnapshot(provider.id)),
    usedAsFallback: false,
  };
}

// Retries only outcomes retrying could plausibly fix. Retrying
// "not_configured" or "not_implemented" would waste a full timeout
// window on a guaranteed-identical outcome.
async function callProviderWithRetry(
  provider: ResearchProvider,
  query: ProviderQuery,
  policy: RetryPolicy
): Promise<ManagedProviderResult> {
  let attempt = 0;
  let outcome = await callProviderOnce(provider, query, policy);

  while (
    attempt < policy.maxRetries &&
    (outcome.result.status === "error" || outcome.result.status === "timeout")
  ) {
    attempt += 1;
    await sleep(policy.baseBackoffMs * 2 ** (attempt - 1));
    outcome = await callProviderOnce(provider, query, policy);
  }

  return outcome;
}

function isUsableResult(outcome: ManagedProviderResult): boolean {
  return (
    outcome.result.status === "ok" && outcome.result.sources.length > 0 && outcome.health !== "offline"
  );
}

// Tries each provider in a fallback chain in order, stopping at the first
// usable result. If the chain is exhausted without one, every attempted
// outcome is still returned (not discarded) so the caller sees an honest
// trail of what was tried and why each attempt fell through.
async function runFallbackChain(
  providerIds: ProviderId[],
  query: ProviderQuery,
  policy: RetryPolicy
): Promise<ManagedProviderResult[]> {
  const attempts: ManagedProviderResult[] = [];

  for (const [index, providerId] of providerIds.entries()) {
    const provider = getProviderById(providerId);
    if (!provider) continue;

    const outcome = await callProviderWithRetry(provider, query, policy);
    attempts.push({ ...outcome, usedAsFallback: index > 0 });

    if (isUsableResult(outcome)) break;
  }

  return attempts;
}

export interface ProviderManagerSearchOptions {
  providerIds?: ProviderId[];
  policy?: RetryPolicy;
}

// The one entry point the orchestrator calls — never a provider
// directly (Step 1's core rule). Providers that belong to a fallback
// chain (see fallbackChains.ts) run through that chain in priority
// order; every other requested provider runs independently in parallel,
// since — unlike tavily/brave — they aren't substitutes for one another
// (a GitHub result doesn't "replace" a missing Reddit result).
export async function searchViaProviderManager(
  query: ProviderQuery,
  options: ProviderManagerSearchOptions = {}
): Promise<ManagedProviderResult[]> {
  const policy = options.policy ?? DEFAULT_RETRY_POLICY;

  const candidateProviders = options.providerIds
    ? options.providerIds
        .map((id) => getProviderById(id))
        .filter((provider): provider is ResearchProvider => provider !== undefined)
    : getRegisteredProviders();

  const candidateIds = new Set(candidateProviders.map((provider) => provider.id));
  const chainedIds = new Set<ProviderId>();
  const relevantChains: ProviderId[][] = [];

  for (const chain of Object.values(FALLBACK_CHAINS)) {
    const relevantChain = chain.filter((id) => candidateIds.has(id));
    if (relevantChain.length === 0) continue;

    relevantChains.push(relevantChain);
    for (const id of relevantChain) chainedIds.add(id);
  }

  const independentProviders = candidateProviders.filter((provider) => !chainedIds.has(provider.id));

  const [chainResults, independentResults] = await Promise.all([
    Promise.all(relevantChains.map((chain) => runFallbackChain(chain, query, policy))),
    Promise.all(independentProviders.map((provider) => callProviderWithRetry(provider, query, policy))),
  ]);

  return [...chainResults.flat(), ...independentResults];
}
