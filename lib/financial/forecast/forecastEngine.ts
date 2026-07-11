import type { ForecastModel, ForecastScenario } from "@/lib/financial/schemas/forecast.schema";
import type { FinancialEstimate } from "@/lib/financial/schemas/estimate.schema";
import type { EconomicsContext } from "@/lib/financial/types/economics";

// ARCHITECTURE ONLY. NO FAKE PROJECTIONS. Every scenario returns
// completely unknown metrics — there is no real forecasting model yet (no
// historical trajectory to extrapolate from, no real growth-rate input),
// so producing an actual projected number here would mean inventing one.
// Mirrors economics/'s and lib/market's sizing/ placeholder discipline.
// A future implementation would extrapolate from real MRR/burn-rate
// history (economics/growthEconomics.ts, economics/operatingEconomics.ts)
// under scenario-specific growth-rate assumptions — the SCENARIO_NOTES
// below document exactly what each scenario's assumption would be.

const SCENARIO_NOTES: Record<ForecastScenario, string> = {
  base_case: "current trajectory extrapolation",
  best_case: "accelerated growth assumption",
  worst_case: "growth stall / extended runway pressure assumption",
};

function buildUnknownEstimate(scenario: ForecastScenario, metric: string): FinancialEstimate {
  return {
    methodology: `${metric}, ${SCENARIO_NOTES[scenario]} — not yet computed.`,
  };
}

export function buildForecastModel(
  scenario: ForecastScenario,
  context: EconomicsContext = {}
): ForecastModel {
  void context;

  return {
    scenario,
    mrr: { ...buildUnknownEstimate(scenario, "MRR"), unit: "usd_per_month" },
    arr: { ...buildUnknownEstimate(scenario, "ARR"), unit: "usd" },
    burnRate: { ...buildUnknownEstimate(scenario, "burn rate"), unit: "usd_per_month" },
    runway: { ...buildUnknownEstimate(scenario, "runway"), unit: "months" },
  };
}

export interface ForecastSet {
  base: ForecastModel;
  best: ForecastModel;
  worst: ForecastModel;
}

// Builds all three required scenarios at once — the shape a future
// forecasting UI would render side by side.
export function buildForecastSet(context: EconomicsContext = {}): ForecastSet {
  return {
    base: buildForecastModel("base_case", context),
    best: buildForecastModel("best_case", context),
    worst: buildForecastModel("worst_case", context),
  };
}
