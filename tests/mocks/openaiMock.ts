import { vi } from "vitest";
import type OpenAI from "openai";

export interface MockOpenAIChatCompletionMessage {
  parsed?: unknown;
  refusal?: string | null;
}

export interface MockOpenAIChatCompletionOptions {
  /** What the mocked chat.completions.parse() call resolves to. */
  message?: MockOpenAIChatCompletionMessage;
  /** If set, chat.completions.parse() rejects with this instead of resolving. */
  rejectWith?: unknown;
}

// A small, hand-rolled mock implementing only the exact OpenAI client
// call chain lib/services/openai.ts actually uses —
// chat.completions.parse({...}) -> { choices: [{ message: { parsed?, refusal? } }] }
// (MILESTONE_34_DESIGN.md Section 5) — not a general-purpose OpenAI SDK
// mock modeling a surface this codebase doesn't use, matching
// tests/mocks/supabaseClient.ts/fetchMock.ts's own "precisely, not
// approximately" philosophy.
export function createMockOpenAIClient(options: MockOpenAIChatCompletionOptions = {}): OpenAI {
  const parse =
    options.rejectWith !== undefined
      ? vi.fn().mockRejectedValue(options.rejectWith)
      : vi.fn().mockResolvedValue({ choices: [{ message: options.message ?? {} }] });

  const client = {
    chat: { completions: { parse } },
  };

  return client as unknown as OpenAI;
}
