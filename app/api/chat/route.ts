import OpenAI from "openai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AnalysisResultSchema } from "@/lib/schemas/analysis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
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
`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content = response.choices[0].message.content ?? "";
    const parsed = AnalysisResultSchema.safeParse(JSON.parse(content));

    if (!parsed.success) {
      console.error("Atlas AI response validation failed:", parsed.error);

      return NextResponse.json(
        {
          error: "Received an unexpected response from the analysis engine.",
        },
        {
          status: 502,
        }
      );
    }

    const analysis = parsed.data;

    const { error } = await supabase.from("projects").insert({
      title: analysis.idea,
      score: analysis.score,
      summary: analysis.summary,
      verdict: analysis.verdict,
      investment_decision: analysis.investment_decision,
      confidence: analysis.confidence,
      customers: analysis.customers,
      problem: analysis.problem,
      solution: analysis.solution,
      market_size: analysis.market_size,
      competition: analysis.competition,
      business_model: analysis.business_model,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      risks: analysis.risks,
      opportunities: analysis.opportunities,
      next_steps: analysis.next_steps,
    });

    if (error) {
      console.error("Supabase Error:", error);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}