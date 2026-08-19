import { z } from "zod";
// Milestone 127 — research's and decision's own RESULT schemas below are
// imported from their specific schema file, not each platform's full
// public barrel (@/lib/research, @/lib/decision) as every other field
// here still is. Reason: this file is reachable from
// hooks/useAnalysisSession.ts (a Client Component, re-validating a
// polled response) via
// lib/analysis-session/schemas/session.schema.ts's own
// PipelineContextSchema reuse — and both platforms' full barrels now
// also re-export a function (providerManager.ts's
// searchViaProviderManager, decisionEngine.ts's synthesizeDecision) that
// imports lib/shared's AsyncLocalStorage-based execution-context helper,
// which needs the Node-only node:async_hooks. A bundler resolving the
// whole barrel to reach ResearchResultSchema/DecisionSynthesisResultSchema
// hits that dependency even though neither function is ever actually
// called client-side — importing the schema file directly avoids the
// barrel (and everything else in it) entirely. Both target files are
// confirmed dependency-free of their own platform's engine/manager
// (verified by reading each directly, not assumed).
import { ResearchResultSchema } from "@/lib/research/schemas/researchResult.schema";
import { CompetitorDiscoveryResultSchema } from "@/lib/competitors";
import { MarketDiscoveryResultSchema } from "@/lib/market";
import { FinancialDiscoveryResultSchema } from "@/lib/financial";
import { BusinessDiscoveryResultSchema } from "@/lib/business";
import { DecisionSynthesisResultSchema } from "@/lib/decision/schemas/discovery.schema";
// Imported from its own file for the identical reason — timingSchema.ts
// has no dependency of its own on lib/shared's Node-only pieces, unlike
// the @/lib/shared barrel as a whole (see lib/shared/timingSchema.ts's
// own comment for the full explanation).
import { DebugInfoSchema } from "@/lib/shared/timingSchema";

// The Pipeline Context (MILESTONE_11_DESIGN.md Section 21) — the single,
// append-only object every stage adds its own output to. Every field
// beyond `startupIdea` is optional because the Context only ever grows;
// it starts with just the idea and gains one field per stage as that
// stage succeeds. Every result schema here is reused directly from its
// owning platform's own public barrel (never redefined) — this file adds
// no new shape, it only names the object that holds all six together.
//
// This Context is never passed as an input to any platform call — every
// stage still invokes its own platform function with only the
// `startupIdea` string (see schemas/stage.schema.ts and stages/). It
// exists solely for this orchestration layer's own observability,
// checkpointing, and partial-result reporting.
//
// `debug` (Milestone 127) — the one field here that isn't a stage's own
// result: runtime timing measurements collected during this execution
// (lib/shared's executionContext.ts/timingCollector.ts — not
// lib/pipeline itself, since the collector must also be reachable from
// lib/research/manager/providerManager.ts, which may never import from
// lib/pipeline — see timingSchema.ts's own comment), attached once at
// the point the run reaches a terminal state. Optional and additive,
// matching every other field's own convention — a checkpoint written
// before this milestone simply has no `debug` key, never a fabricated
// one.
export const PipelineContextSchema = z.object({
  startupIdea: z.string().min(1),
  research: ResearchResultSchema.optional(),
  competitors: CompetitorDiscoveryResultSchema.optional(),
  market: MarketDiscoveryResultSchema.optional(),
  financial: FinancialDiscoveryResultSchema.optional(),
  business: BusinessDiscoveryResultSchema.optional(),
  decision: DecisionSynthesisResultSchema.optional(),
  debug: DebugInfoSchema.optional(),
});

export type PipelineContext = z.infer<typeof PipelineContextSchema>;
