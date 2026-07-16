import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockOpenAIClient } from "@/tests/mocks/openaiMock";
import type { Evidence } from "@/lib/research";

// generateCandidateFindings' first-ever automated test
// (MILESTONE_34_DESIGN.md Deliverable 2). Mocks the OpenAI SDK client
// itself — the one layer this file owns — never a real network call.

vi.mock("openai", () => ({ default: vi.fn() }));

import OpenAI from "openai";
import {
  generateCandidateFindings,
  generateCandidateRisks,
  generateCandidateThesisArguments,
} from "@/lib/services/openai";

const mockedOpenAI = vi.mocked(OpenAI);

// The real code calls `new OpenAI()` — a plain arrow function passed to
// mockImplementation cannot be invoked with `new` (arrow functions have
// no [[Construct]] internal method), so this must be a real `function`
// expression, not the more common arrow-function shorthand.
function mockOpenAIConstructor(options: Parameters<typeof createMockOpenAIClient>[0]): void {
  mockedOpenAI.mockImplementation(function mockConstructor() {
    return createMockOpenAIClient(options);
  } as unknown as typeof OpenAI);
}

function buildEvidence(id: string, confidence = 80): Evidence {
  return {
    id,
    claim: `Claim for ${id}`,
    evidence: `Supporting text for ${id}`,
    confidence,
    source: {
      id: `source_${id}`,
      providerId: "tavily",
      sourceType: "search_engine",
      title: `Source for ${id}`,
      url: `https://example.com/${id}`,
      domain: "example.com",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      confidence,
    },
    url: `https://example.com/${id}`,
    retrievedAt: "2026-01-01T00:00:00.000Z",
  };
}

afterEach(() => {
  mockedOpenAI.mockReset();
});

describe("generateCandidateFindings", () => {
  it("returns the parsed candidate findings on a successful call", async () => {
    const candidateFindings = [
      {
        summary: "A real, grounded finding.",
        citedEvidenceIds: ["evidence-a"],
        category: "market" as const,
        severity: "medium" as const,
        confidence: 70,
      },
    ];
    mockOpenAIConstructor({ message: { parsed: { findings: candidateFindings } } });

    const result = await generateCandidateFindings("A startup idea.", [buildEvidence("evidence-a")]);

    expect(result).toEqual(candidateFindings);
  });

  it("calls the client with a system and user message, and a response_format", async () => {
    mockOpenAIConstructor({ message: { parsed: { findings: [] } } });

    await generateCandidateFindings("A startup idea.", [buildEvidence("evidence-a")]);

    const client = mockedOpenAI.mock.results[0]?.value;
    const parseCall = vi.mocked(client.chat.completions.parse).mock.calls[0]?.[0];

    expect(parseCall.messages).toHaveLength(2);
    expect(parseCall.messages[0].role).toBe("system");
    expect(parseCall.messages[1].role).toBe("user");
    expect(parseCall.response_format).toBeDefined();
  });

  it("bounds the prompt to the highest-confidence 25 evidence items when more are supplied", async () => {
    mockOpenAIConstructor({ message: { parsed: { findings: [] } } });

    // 30 items, confidence 0-29 — evidence-0 is lowest, evidence-29 is
    // highest. Only the top 25 by confidence should reach the prompt.
    const evidence = Array.from({ length: 30 }, (_, index) => buildEvidence(`evidence-${index}`, index));

    await generateCandidateFindings("A startup idea.", evidence);

    const client = mockedOpenAI.mock.results[0]?.value;
    const parseCall = vi.mocked(client.chat.completions.parse).mock.calls[0]?.[0];
    const userMessageContent = parseCall.messages[1].content as string;

    for (let index = 5; index < 30; index += 1) {
      expect(userMessageContent).toContain(`evidence-${index}`);
    }
    for (let index = 0; index < 5; index += 1) {
      expect(userMessageContent).not.toContain(`evidence-${index}\n`);
    }
  });

  it("throws ExternalServiceError with a distinct message when the model refuses", async () => {
    mockOpenAIConstructor({ message: { refusal: "This request violates policy." } });

    await expect(generateCandidateFindings("A startup idea.", [buildEvidence("evidence-a")])).rejects.toThrow(
      /refused to generate/i
    );
  });

  it("throws ExternalServiceError with a distinct message when there is no parsed result and no refusal", async () => {
    mockOpenAIConstructor({ message: {} });

    await expect(generateCandidateFindings("A startup idea.", [buildEvidence("evidence-a")])).rejects.toThrow(
      /no parseable candidate findings/i
    );
  });

  it("wraps a rejected client call (e.g. a network error) in an ExternalServiceError", async () => {
    mockOpenAIConstructor({ rejectWith: new Error("connection reset") });

    await expect(generateCandidateFindings("A startup idea.", [buildEvidence("evidence-a")])).rejects.toThrow(
      /connection reset/i
    );
  });
});

// generateCandidateRisks()'s first-ever test (MILESTONE_35_DESIGN.md
// Deliverable 2) — mirrors generateCandidateFindings()'s own coverage
// exactly, since both share the identical SDK call shape, error
// handling, and evidence-selection machinery, differing only in schema
// and prompt.
describe("generateCandidateRisks", () => {
  it("returns the parsed candidate risks on a successful call", async () => {
    const candidateRisks = [
      {
        summary: "A real, grounded risk.",
        citedEvidenceIds: ["evidence-a"],
        category: "market" as const,
        severity: "high" as const,
        confidence: 65,
      },
    ];
    mockOpenAIConstructor({ message: { parsed: { risks: candidateRisks } } });

    const result = await generateCandidateRisks("A startup idea.", [buildEvidence("evidence-a")]);

    expect(result).toEqual(candidateRisks);
  });

  it("calls the client with a system and user message, and a response_format", async () => {
    mockOpenAIConstructor({ message: { parsed: { risks: [] } } });

    await generateCandidateRisks("A startup idea.", [buildEvidence("evidence-a")]);

    const client = mockedOpenAI.mock.results[0]?.value;
    const parseCall = vi.mocked(client.chat.completions.parse).mock.calls[0]?.[0];

    expect(parseCall.messages).toHaveLength(2);
    expect(parseCall.messages[0].role).toBe("system");
    expect(parseCall.messages[1].role).toBe("user");
    expect(parseCall.response_format).toBeDefined();
  });

  it("bounds the prompt to the highest-confidence 25 evidence items when more are supplied", async () => {
    mockOpenAIConstructor({ message: { parsed: { risks: [] } } });

    // 30 items, confidence 0-29 — evidence-0 is lowest, evidence-29 is
    // highest. Only the top 25 by confidence should reach the prompt.
    const evidence = Array.from({ length: 30 }, (_, index) => buildEvidence(`evidence-${index}`, index));

    await generateCandidateRisks("A startup idea.", evidence);

    const client = mockedOpenAI.mock.results[0]?.value;
    const parseCall = vi.mocked(client.chat.completions.parse).mock.calls[0]?.[0];
    const userMessageContent = parseCall.messages[1].content as string;

    for (let index = 5; index < 30; index += 1) {
      expect(userMessageContent).toContain(`evidence-${index}`);
    }
    for (let index = 0; index < 5; index += 1) {
      expect(userMessageContent).not.toContain(`evidence-${index}\n`);
    }
  });

  it("throws ExternalServiceError with a distinct message when the model refuses", async () => {
    mockOpenAIConstructor({ message: { refusal: "This request violates policy." } });

    await expect(generateCandidateRisks("A startup idea.", [buildEvidence("evidence-a")])).rejects.toThrow(
      /refused to generate/i
    );
  });

  it("throws ExternalServiceError with a distinct message when there is no parsed result and no refusal", async () => {
    mockOpenAIConstructor({ message: {} });

    await expect(generateCandidateRisks("A startup idea.", [buildEvidence("evidence-a")])).rejects.toThrow(
      /no parseable candidate risks/i
    );
  });

  it("wraps a rejected client call (e.g. a network error) in an ExternalServiceError", async () => {
    mockOpenAIConstructor({ rejectWith: new Error("connection reset") });

    await expect(generateCandidateRisks("A startup idea.", [buildEvidence("evidence-a")])).rejects.toThrow(
      /connection reset/i
    );
  });
});

// generateCandidateThesisArguments()'s first-ever test
// (MILESTONE_36_DESIGN.md Deliverable 2) — mirrors the existing two
// suites' coverage exactly, since all three share the identical SDK
// call shape, error handling, and evidence-selection machinery
// (buildEvidencePrompt(), the three-strikes consolidation), differing
// only in schema and prompt.
describe("generateCandidateThesisArguments", () => {
  it("returns the parsed candidate thesis arguments on a successful call", async () => {
    const candidateArguments = [
      {
        summary: "A real, grounded argument.",
        citedEvidenceIds: ["evidence-a"],
        kind: "positive" as const,
      },
    ];
    mockOpenAIConstructor({ message: { parsed: { arguments: candidateArguments } } });

    const result = await generateCandidateThesisArguments("A startup idea.", [buildEvidence("evidence-a")]);

    expect(result).toEqual(candidateArguments);
  });

  it("calls the client with a system and user message, and a response_format", async () => {
    mockOpenAIConstructor({ message: { parsed: { arguments: [] } } });

    await generateCandidateThesisArguments("A startup idea.", [buildEvidence("evidence-a")]);

    const client = mockedOpenAI.mock.results[0]?.value;
    const parseCall = vi.mocked(client.chat.completions.parse).mock.calls[0]?.[0];

    expect(parseCall.messages).toHaveLength(2);
    expect(parseCall.messages[0].role).toBe("system");
    expect(parseCall.messages[1].role).toBe("user");
    expect(parseCall.response_format).toBeDefined();
  });

  it("bounds the prompt to the highest-confidence 25 evidence items when more are supplied", async () => {
    mockOpenAIConstructor({ message: { parsed: { arguments: [] } } });

    // 30 items, confidence 0-29 — evidence-0 is lowest, evidence-29 is
    // highest. Only the top 25 by confidence should reach the prompt.
    const evidence = Array.from({ length: 30 }, (_, index) => buildEvidence(`evidence-${index}`, index));

    await generateCandidateThesisArguments("A startup idea.", evidence);

    const client = mockedOpenAI.mock.results[0]?.value;
    const parseCall = vi.mocked(client.chat.completions.parse).mock.calls[0]?.[0];
    const userMessageContent = parseCall.messages[1].content as string;

    for (let index = 5; index < 30; index += 1) {
      expect(userMessageContent).toContain(`evidence-${index}`);
    }
    for (let index = 0; index < 5; index += 1) {
      expect(userMessageContent).not.toContain(`evidence-${index}\n`);
    }
  });

  it("throws ExternalServiceError with a distinct message when the model refuses", async () => {
    mockOpenAIConstructor({ message: { refusal: "This request violates policy." } });

    await expect(
      generateCandidateThesisArguments("A startup idea.", [buildEvidence("evidence-a")])
    ).rejects.toThrow(/refused to generate/i);
  });

  it("throws ExternalServiceError with a distinct message when there is no parsed result and no refusal", async () => {
    mockOpenAIConstructor({ message: {} });

    await expect(
      generateCandidateThesisArguments("A startup idea.", [buildEvidence("evidence-a")])
    ).rejects.toThrow(/no parseable candidate thesis arguments/i);
  });

  it("wraps a rejected client call (e.g. a network error) in an ExternalServiceError", async () => {
    mockOpenAIConstructor({ rejectWith: new Error("connection reset") });

    await expect(
      generateCandidateThesisArguments("A startup idea.", [buildEvidence("evidence-a")])
    ).rejects.toThrow(/connection reset/i);
  });
});
