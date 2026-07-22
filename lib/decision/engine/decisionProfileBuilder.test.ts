import { describe, it, expect } from "vitest";
import { buildDecisionProfile } from "@/lib/decision/engine/decisionProfileBuilder";
import type { BuildDecisionProfileInput } from "@/lib/decision/engine/decisionProfileBuilder";
import { buildMarketProfile } from "@/lib/market";
import { buildFinancialProfile } from "@/lib/financial";
import { buildBusinessProfile } from "@/lib/business";
import { buildCompanyProfile } from "@/lib/competitors";
import { deriveDecisionReadiness } from "@/lib/decision/readiness/decisionReadiness";
import { deriveEmptyThesis } from "@/lib/decision/thesis/investmentThesis";
import { computeDecisionConfidence } from "@/lib/decision/confidence/decisionConfidence";
import { buildDecisionRefreshMetadata } from "@/lib/decision/refresh/decisionRefreshPolicy";
import type { Evidence } from "@/lib/research";
import type { Finding } from "@/lib/decision/schemas/finding.schema";
import type { RiskFinding } from "@/lib/decision/schemas/riskFinding.schema";

// Milestone — decisionProfileBuilder.ts and evidenceAggregator.ts were
// the last two lib/decision collaborators of synthesizeDecision() with
// no dedicated test file of their own (previously exercised only
// indirectly, through lib/pipeline/stages/decision.test.ts). Neither
// function has an external boundary anywhere in its own call graph —
// every real collaborator (deriveEmptyThesis, deriveDecisionReadiness,
// computeDecisionConfidence, buildDecisionRefreshMetadata, parseOrThrow,
// dedupeByKey/urlDedupeKey, and the three platform profile builders) is
// pure, synchronous, and already independently tested — so this file
// uses zero mocks.
const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

function buildEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence_1",
    claim: "The market is growing",
    evidence: "An industry report cites double-digit growth.",
    confidence: 70,
    source: {
      id: "source_1",
      providerId: "tavily",
      sourceType: "search_engine",
      title: "Industry report",
      url: "https://example.com/report",
      domain: "example.com",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      confidence: 80,
    },
    url: "https://example.com/report",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "finding_1",
    category: "market",
    severity: "medium",
    summary: "A real finding.",
    evidence: [],
    confidence: 70,
    ...overrides,
  };
}

function buildRiskFinding(overrides: Partial<RiskFinding> = {}): RiskFinding {
  return {
    id: "risk_1",
    category: "market",
    severity: "high",
    summary: "A real risk.",
    evidence: [buildEvidence()],
    confidence: 70,
    ...overrides,
  };
}

// The baseline every test starts from: every CoverageChecklist condition
// false, no evidence/sources/competitors/findings/risks, a fixed `now`
// for deterministic refresh assertions. Individual tests override only
// the one input that condition depends on.
function buildBaselineInput(overrides: Partial<BuildDecisionProfileInput> = {}): BuildDecisionProfileInput {
  return {
    decisionContext: { startupIdea: "A subscription scheduling tool" },
    businessSummary: { overallHealth: {} },
    marketProfile: buildMarketProfile({ industry: "unclassified", confidence: 0 }),
    financialProfile: buildFinancialProfile({ confidence: 0 }),
    businessProfile: buildBusinessProfile({ confidence: 0 }),
    now: FIXED_NOW,
    ...overrides,
  };
}

const CHECKLIST_TOGGLES: Array<[string, (input: BuildDecisionProfileInput) => BuildDecisionProfileInput]> = [
  [
    "hasBusinessModel",
    (input) => ({
      ...input,
      businessSummary: { ...input.businessSummary, businessModel: "B2B SaaS" },
    }),
  ],
  [
    "hasValueProposition",
    (input) => ({
      ...input,
      businessSummary: { ...input.businessSummary, valueProposition: "Saves scheduling time" },
    }),
  ],
  [
    "hasCustomerProblem",
    (input) => ({
      ...input,
      businessSummary: { ...input.businessSummary, customerProblem: "Scheduling is manual and error-prone" },
    }),
  ],
  [
    "hasMarketIndustry",
    (input) => ({
      ...input,
      decisionContext: { ...input.decisionContext, marketIndustry: "software" },
    }),
  ],
  [
    "hasFundingStage",
    (input) => ({
      ...input,
      decisionContext: { ...input.decisionContext, fundingStage: "seed" },
    }),
  ],
  ["hasFindings", (input) => ({ ...input, findings: [buildFinding()] })],
  ["hasCriticalRisks", (input) => ({ ...input, criticalRisks: [buildRiskFinding()] })],
  ["hasEvidence", (input) => ({ ...input, evidence: [buildEvidence()] })],
  [
    "hasCompetitorProfiles",
    (input) => ({ ...input, keyCompetitors: [buildCompanyProfile({ name: "Acme", confidence: 0 })] }),
  ],
  [
    "hasMarketProfile",
    (input) => ({ ...input, marketProfile: buildMarketProfile({ industry: "software", confidence: 0 }) }),
  ],
];

describe("buildDecisionProfile", () => {
  describe("coverage checklist derivation (observed via confidenceSummary.coverage)", () => {
    it("scores 0% coverage when every checklist condition is absent", () => {
      const result = buildDecisionProfile(buildBaselineInput());
      expect(result.confidenceSummary.coverage).toBe(0);
    });

    it("treats an explicitly 'unclassified' marketIndustry the same as an absent one", () => {
      const result = buildDecisionProfile(
        buildBaselineInput({ decisionContext: { startupIdea: "An idea", marketIndustry: "unclassified" } })
      );
      expect(result.confidenceSummary.coverage).toBe(0);
    });

    it.each(CHECKLIST_TOGGLES)("raises coverage by exactly one tenth when %s becomes true", (_name, modify) => {
      const result = buildDecisionProfile(modify(buildBaselineInput()));
      expect(result.confidenceSummary.coverage).toBe(10);
    });

    it("scores 100% coverage when every checklist condition is present", () => {
      const result = buildDecisionProfile(
        buildBaselineInput({
          decisionContext: { startupIdea: "An idea", marketIndustry: "software", fundingStage: "seed" },
          businessSummary: {
            overallHealth: {},
            businessModel: "B2B SaaS",
            valueProposition: "Saves scheduling time",
            customerProblem: "Scheduling is manual and error-prone",
          },
          marketProfile: buildMarketProfile({ industry: "software", confidence: 0 }),
          findings: [buildFinding()],
          criticalRisks: [buildRiskFinding()],
          evidence: [buildEvidence()],
          keyCompetitors: [buildCompanyProfile({ name: "Acme", confidence: 0 })],
        })
      );
      expect(result.confidenceSummary.coverage).toBe(100);
    });
  });

  describe("open questions derivation", () => {
    it("raises one open question per missing businessSummary field, in a fixed order", () => {
      const result = buildDecisionProfile(buildBaselineInput());
      expect(result.openQuestions).toEqual([
        "Value proposition has not been established yet.",
        "Customer problem has not been established yet.",
        "Business model has not been established yet.",
        "Competitive position has not been assessed yet.",
      ]);
    });

    it("raises no open questions when every businessSummary field is present", () => {
      const result = buildDecisionProfile(
        buildBaselineInput({
          businessSummary: {
            overallHealth: {},
            businessModel: "B2B SaaS",
            valueProposition: "Saves scheduling time",
            customerProblem: "Scheduling is manual and error-prone",
            competitivePosition: "challenger",
          },
        })
      );
      expect(result.openQuestions).toEqual([]);
    });
  });

  describe("decision limitations derivation", () => {
    it("always includes the placeholder-scoring limitation", () => {
      const result = buildDecisionProfile(buildBaselineInput());
      expect(result.decisionLimitations).toContain(
        "Scoring dimensions across the Business, Financial, Market, and Competitor Platforms are architecture-only placeholders and do not yet reflect real analysis."
      );
    });

    it("adds the no-evidence limitation only when no evidence was gathered", () => {
      const withoutEvidence = buildDecisionProfile(buildBaselineInput());
      const withEvidence = buildDecisionProfile(buildBaselineInput({ evidence: [buildEvidence()] }));

      expect(withoutEvidence.decisionLimitations).toHaveLength(2);
      expect(withEvidence.decisionLimitations).toHaveLength(1);
    });
  });

  describe("optional-field defaulting", () => {
    it("defaults every optional list field to an empty array when omitted", () => {
      const result = buildDecisionProfile(buildBaselineInput());

      expect(result.sources).toEqual([]);
      expect(result.evidence).toEqual([]);
      expect(result.keyCompetitors).toEqual([]);
      expect(result.keyFindings).toEqual([]);
      expect(result.criticalRisks).toEqual([]);
      expect(result.strengths).toEqual([]);
      expect(result.weaknesses).toEqual([]);
      expect(result.opportunities).toEqual([]);
      expect(result.threats).toEqual([]);
    });

    it("passes through every optional list field unchanged when provided", () => {
      const evidence = [buildEvidence()];
      const result = buildDecisionProfile(
        buildBaselineInput({
          evidence,
          strengths: ["Strong team"],
          weaknesses: ["No moat yet"],
          opportunities: ["Underserved niche"],
          threats: ["Well-funded incumbent"],
        })
      );

      expect(result.evidence).toEqual(evidence);
      expect(result.strengths).toEqual(["Strong team"]);
      expect(result.weaknesses).toEqual(["No moat yet"]);
      expect(result.opportunities).toEqual(["Underserved niche"]);
      expect(result.threats).toEqual(["Well-funded incumbent"]);
    });

    it("defaults investmentThesis to deriveEmptyThesis()'s real output when omitted", () => {
      const result = buildDecisionProfile(buildBaselineInput());
      expect(result.investmentThesis).toEqual(deriveEmptyThesis());
    });

    it("passes through a provided investmentThesis unchanged", () => {
      const thesis = {
        positiveArguments: ["Large addressable market"],
        negativeArguments: [],
        unknowns: [],
        contradictions: [],
        supportingEvidence: [],
      };
      const result = buildDecisionProfile(buildBaselineInput({ investmentThesis: thesis }));
      expect(result.investmentThesis).toEqual(thesis);
    });
  });

  describe("collaborator wiring", () => {
    it("passes through marketProfile, financialProfile, and businessProfile unchanged", () => {
      const marketProfile = buildMarketProfile({ industry: "fintech", confidence: 40 });
      const financialProfile = buildFinancialProfile({ confidence: 40 });
      const businessProfile = buildBusinessProfile({ confidence: 40 });

      const result = buildDecisionProfile(
        buildBaselineInput({ marketProfile, financialProfile, businessProfile })
      );

      expect(result.marketProfile).toEqual(marketProfile);
      expect(result.financialProfile).toEqual(financialProfile);
      expect(result.businessProfile).toEqual(businessProfile);
    });

    it("uses deriveDecisionReadiness()'s real output for decisionReadiness", () => {
      const result = buildDecisionProfile(buildBaselineInput());
      expect(result.decisionReadiness).toEqual(deriveDecisionReadiness());
    });

    it("computes confidenceSummary using the same real computeDecisionConfidence every other caller uses", () => {
      const evidence = [buildEvidence({ confidence: 60 }), buildEvidence({ id: "evidence_2", confidence: 80 })];
      const result = buildDecisionProfile(buildBaselineInput({ evidence }));

      const expectedConfidence = computeDecisionConfidence({
        sources: [],
        evidence,
        checklist: {
          hasBusinessModel: false,
          hasValueProposition: false,
          hasCustomerProblem: false,
          hasMarketIndustry: false,
          hasFundingStage: false,
          hasFindings: false,
          hasCriticalRisks: false,
          hasEvidence: true,
          hasCompetitorProfiles: false,
          hasMarketProfile: false,
        },
      });

      expect(result.confidenceSummary).toEqual(expectedConfidence);
    });

    it("builds refresh metadata using the same real buildDecisionRefreshMetadata every other caller uses", () => {
      const result = buildDecisionProfile(buildBaselineInput({ now: FIXED_NOW }));

      const expectedRefresh = buildDecisionRefreshMetadata(
        "initial_discovery",
        result.confidenceSummary.evidenceConfidence,
        FIXED_NOW
      );

      expect(result.refresh).toEqual(expectedRefresh);
    });

    it("defaults now to the current time when omitted", () => {
      const before = Date.now();

      const result = buildDecisionProfile({
        decisionContext: { startupIdea: "An idea" },
        businessSummary: { overallHealth: {} },
        marketProfile: buildMarketProfile({ industry: "unclassified", confidence: 0 }),
        financialProfile: buildFinancialProfile({ confidence: 0 }),
        businessProfile: buildBusinessProfile({ confidence: 0 }),
      });

      const after = Date.now();
      const lastUpdatedMs = Date.parse(result.refresh.lastUpdated);

      expect(lastUpdatedMs).toBeGreaterThanOrEqual(before);
      expect(lastUpdatedMs).toBeLessThanOrEqual(after);
    });
  });

  describe("id generation", () => {
    it("assigns a non-empty string id", () => {
      const result = buildDecisionProfile(buildBaselineInput());
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });

    it("assigns a different id on each call", () => {
      const first = buildDecisionProfile(buildBaselineInput());
      const second = buildDecisionProfile(buildBaselineInput());
      expect(first.id).not.toBe(second.id);
    });
  });
});
