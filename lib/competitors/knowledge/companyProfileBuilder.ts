import type { Source, Evidence } from "@/lib/research";
import type { CompanyProfile } from "@/lib/competitors/schemas/company.schema";
import { CompanyProfileSchema } from "@/lib/competitors/schemas/company.schema";
import { buildRefreshMetadata } from "@/lib/competitors/refresh/refreshPolicy";
import { parseOrThrow } from "@/lib/validation/parse";

let companyIdCounter = 0;

function nextCompanyId(): string {
  companyIdCounter += 1;
  return `company_${Date.now()}_${companyIdCounter}`;
}

export interface BuildCompanyProfileInput {
  name: string;
  aliases?: string[];
  website?: string;
  sources?: Source[];
  evidence?: Evidence[];
  confidence: number;
  now?: Date;
}

// The one place a brand-new CompanyProfile gets constructed — every other
// field starts empty/undefined rather than guessed, so a profile is always
// exactly as complete as its real sources make it (see PROVIDER_MANAGER.md
// / this project's "never fabricate" rule, applied to competitor data).
// Mirrors lib/research/evidence/evidenceBuilder.ts's buildEvidence: a
// counter-based id, parseOrThrow at the end so a malformed input can never
// silently produce an invalid profile.
export function buildCompanyProfile(input: BuildCompanyProfileInput): CompanyProfile {
  const now = input.now ?? new Date();

  return parseOrThrow(
    CompanyProfileSchema,
    {
      id: nextCompanyId(),
      name: input.name,
      aliases: input.aliases ?? [],
      website: input.website,
      features: [],
      technology: [],
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
      sources: input.sources ?? [],
      evidence: input.evidence ?? [],
      confidence: input.confidence,
      refresh: buildRefreshMetadata("initial_discovery", input.confidence, now),
    },
    "Failed to build a schema-valid CompanyProfile."
  );
}
