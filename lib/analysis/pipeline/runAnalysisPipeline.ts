import type { AnalysisResult } from "@/lib/schemas/analysis";
import type { PipelineContext } from "@/lib/analysis/types/context";

import { analyze as analyzeIdea } from "@/lib/analysis/stages/ideaAnalysis";
import { analyze as analyzeProblem } from "@/lib/analysis/stages/problemAnalysis";
import { analyze as analyzeMarket } from "@/lib/analysis/stages/marketAnalysis";
import { analyze as analyzeCustomers } from "@/lib/analysis/stages/customerAnalysis";
import { analyze as analyzeCompetition } from "@/lib/analysis/stages/competitionAnalysis";
import { analyze as analyzeBusinessModel } from "@/lib/analysis/stages/businessModelAnalysis";
import { analyze as analyzeRisks } from "@/lib/analysis/stages/riskAnalysis";
import { analyze as analyzeOpportunities } from "@/lib/analysis/stages/opportunityAnalysis";
import { analyze as analyzeExecutionRoadmap } from "@/lib/analysis/stages/executionRoadmap";
import { analyze as analyzeInvestmentScoring } from "@/lib/analysis/stages/investmentScoring";
import { analyze as analyzeFinalReport } from "@/lib/analysis/stages/finalReportAssembly";

// Orchestrates all eleven stages in sequence, threading a single
// PipelineContext through each one. Every stage after the first depends on
// fields earlier stages produced, so stages run sequentially rather than in
// parallel — see PIPELINE.md for why, and for how a future stage could be
// parallelized once it no longer depends on a sibling's output.
//
// For now every stage calls the same underlying OpenAI service
// (lib/services/openai.ts's runChatCompletion); nothing here assumes that
// will always be true. See PIPELINE.md's "Future Extension Points" for how
// a stage becomes an independently swappable agent later without changing
// this orchestrator's shape.
export async function runAnalysisPipeline(idea: string): Promise<AnalysisResult> {
  let context: PipelineContext = { idea };

  const ideaResult = await analyzeIdea({ idea: context.idea });
  context = { ...context, ...ideaResult };

  const problemResult = await analyzeProblem({
    idea: context.idea,
    summary: context.summary!,
  });
  context = { ...context, ...problemResult };

  const marketResult = await analyzeMarket({
    idea: context.idea,
    summary: context.summary!,
    problem: context.problem!,
    solution: context.solution!,
  });
  context = { ...context, ...marketResult };

  const customerResult = await analyzeCustomers({
    idea: context.idea,
    summary: context.summary!,
    problem: context.problem!,
    solution: context.solution!,
    market_size: context.market_size!,
  });
  context = { ...context, ...customerResult };

  const competitionResult = await analyzeCompetition({
    idea: context.idea,
    summary: context.summary!,
    problem: context.problem!,
    solution: context.solution!,
    market_size: context.market_size!,
    customers: context.customers!,
  });
  context = { ...context, ...competitionResult };

  const businessModelResult = await analyzeBusinessModel({
    idea: context.idea,
    summary: context.summary!,
    solution: context.solution!,
    market_size: context.market_size!,
    customers: context.customers!,
    competition: context.competition!,
  });
  context = { ...context, ...businessModelResult };

  const riskResult = await analyzeRisks({
    idea: context.idea,
    problem: context.problem!,
    solution: context.solution!,
    market_size: context.market_size!,
    competition: context.competition!,
    business_model: context.business_model!,
  });
  context = { ...context, ...riskResult };

  const opportunityResult = await analyzeOpportunities({
    idea: context.idea,
    market_size: context.market_size!,
    customers: context.customers!,
    competition: context.competition!,
    business_model: context.business_model!,
  });
  context = { ...context, ...opportunityResult };

  const executionRoadmapResult = await analyzeExecutionRoadmap({
    idea: context.idea,
    solution: context.solution!,
    business_model: context.business_model!,
    risks: context.risks!,
    opportunities: context.opportunities!,
  });
  context = { ...context, ...executionRoadmapResult };

  const investmentScoringResult = await analyzeInvestmentScoring({
    idea: context.idea,
    summary: context.summary!,
    problem: context.problem!,
    solution: context.solution!,
    market_size: context.market_size!,
    customers: context.customers!,
    competition: context.competition!,
    business_model: context.business_model!,
    risks: context.risks!,
    opportunities: context.opportunities!,
    next_steps: context.next_steps!,
  });
  context = { ...context, ...investmentScoringResult };

  return analyzeFinalReport(context);
}
