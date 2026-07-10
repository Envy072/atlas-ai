import type { AnalysisResult } from "@/lib/schemas/analysis";
import type { PipelineContext } from "@/lib/analysis/types/context";
import { assembleFinalReport } from "@/lib/analysis/mappers/reportAssembler";

export type FinalReportAssemblyInput = PipelineContext;
export type FinalReportAssemblyOutput = AnalysisResult;

// Stage 11 — the only stage that doesn't call the model. By the time this
// runs, every prior stage has already populated the context; this stage's
// job is purely to validate completeness and hand back the final,
// schema-conformant AnalysisResult via the reusable report assembler.
export async function analyze(
  input: FinalReportAssemblyInput
): Promise<FinalReportAssemblyOutput> {
  return assembleFinalReport(input);
}
