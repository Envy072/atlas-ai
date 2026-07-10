import { z } from "zod";

// A provider's current standing, computed from its recent metrics (see
// manager/health.ts) — not a static property of the provider itself.
// - healthy: recent requests are succeeding at a normal rate
// - degraded: still succeeding sometimes, but failing/timing out often
//   enough that ProviderManager should prefer a fallback when one exists
// - offline: no recent success at all; ProviderManager should skip it
export const ProviderHealthSchema = z.enum(["healthy", "degraded", "offline"]);

export type ProviderHealth = z.infer<typeof ProviderHealthSchema>;
