import OpenAI from "openai";
import { ExternalServiceError } from "@/lib/errors";

const ATLAS_SYSTEM_PROMPT = `
You are Atlas AI.

You are an elite startup intelligence engine.

Your job is NOT to praise startup ideas.

Your job is to think like an investment committee.

You combine the thinking of:

- Y Combinator Partner
- Sequoia Capital Investor
- McKinsey Strategy Consultant
- Product Manager
- Growth Marketer
- Startup Founder
- Financial Analyst

Rules:

- Think critically.
- Challenge weak assumptions.
- Never invent fake facts.
- Never invent statistics.
- Never fabricate market size.
- If information is unknown, make a realistic assumption and clearly state it.
- Keep every section concise.
- Return ONLY valid JSON.
- Do NOT include markdown.
- Do NOT include explanations outside JSON.

Return exactly this schema:

{
  "idea":"",
  "summary":"",
  "score":90,

  "verdict":"Recommended",
  "investment_decision":"Invest",
  "confidence":91,

  "customers":"",
  "problem":"",
  "solution":"",
  "market_size":"",
  "competition":"",
  "business_model":"",

  "strengths":[
    "",
    "",
    ""
  ],

  "weaknesses":[
    "",
    "",
    ""
  ],

  "risks":[
    "",
    "",
    ""
  ],

  "opportunities":[
    "",
    "",
    ""
  ],

  "next_steps":[
    "",
    "",
    ""
  ]
}
`;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

export interface ChatCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

// Generic entry point: send a system/user prompt pair to the model and
// return the parsed (but not yet schema-validated) JSON payload. This is
// the one place that actually talks to the OpenAI SDK — every caller in
// this codebase, including the analysis pipeline's individual stages,
// goes through this function rather than constructing its own client call.
export async function runChatCompletion(params: ChatCompletionParams): Promise<unknown> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions
    .create({
      model: "gpt-4.1-mini",
      temperature: params.temperature ?? 0.7,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: params.systemPrompt,
        },
        {
          role: "user",
          content: params.userPrompt,
        },
      ],
    })
    .catch((error: unknown) => {
      throw new ExternalServiceError(
        "OpenAI",
        error instanceof Error ? error.message : undefined
      );
    });

  const content = response.choices[0].message.content ?? "";

  try {
    return JSON.parse(content);
  } catch {
    throw new ExternalServiceError(
      "OpenAI",
      "Received malformed JSON from the analysis engine."
    );
  }
}

// Calls the model with the full-analysis Atlas prompt and returns the
// parsed (but not yet schema-validated) JSON payload. Validation is the
// analysis service's job, not this one.
export async function generateStartupAnalysis(idea: string): Promise<unknown> {
  return runChatCompletion({
    systemPrompt: ATLAS_SYSTEM_PROMPT,
    userPrompt: idea,
  });
}
