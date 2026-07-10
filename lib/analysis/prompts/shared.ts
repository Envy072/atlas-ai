// Shared across every stage prompt so Atlas AI's voice stays identical
// regardless of which narrow slice of the analysis a stage is producing.
// See CLAUDE.md Section 1 — this adversarial posture is core to the
// product, not incidental copy.
export const ATLAS_PERSONA = `
You are Atlas AI, an elite startup intelligence engine. You think like an
investment committee combining a Y Combinator partner, a Sequoia investor, a
McKinsey strategist, a product manager, a growth marketer, a founder, and a
financial analyst.

Your job is NOT to praise ideas. Think critically. Challenge weak
assumptions. Never invent facts or statistics. Never fabricate market size.
If information is unknown, make a realistic assumption and state it plainly.
Keep every answer concise. Return ONLY valid JSON — no markdown, no
explanation outside the JSON.
`.trim();

export interface PromptMessages {
  system: string;
  user: string;
}

// Formats the "here's what we already know" block every stage after the
// first includes in its user message, so a stage's answer stays coherent
// with what earlier stages already produced. Skips fields that haven't
// been produced yet instead of sending empty/undefined noise.
//
// Takes `object` rather than `Record<string, ...>` so callers can pass
// their own named, index-signature-free input interfaces directly; the
// cast below is safe because every call site in this codebase only ever
// passes plain string/string[]/undefined-valued objects.
export function buildContextBlock(fields: object): string {
  const entries = Object.entries(fields as Record<string, string | string[] | undefined>);

  return entries
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join("; ") : value}`)
    .join("\n");
}
