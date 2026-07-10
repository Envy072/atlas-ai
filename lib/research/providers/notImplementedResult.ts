import type { ProviderId } from "@/lib/research/schemas/enums";
import type { ProviderResult } from "@/lib/research/schemas/providerResult.schema";
import type { ProviderQuery } from "@/lib/research/types/provider";

// Every placeholder provider returns this shape: zero sources, and a
// status that's explicitly "not_implemented" — never "ok" with an empty
// array, which would be indistinguishable from a real search that
// genuinely found nothing. `tookMs` is a real (if tiny) measurement even
// though there's no real request to time yet, so the field means the
// same thing once a provider becomes real.
export function buildNotImplementedResult(
  providerId: ProviderId,
  query: ProviderQuery,
  startedAt: number
): ProviderResult {
  return {
    providerId,
    query: query.topic,
    status: "not_implemented",
    sources: [],
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
  };
}
