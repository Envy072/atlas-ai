import { z } from "zod";
import { RefreshPrioritySchema, RefreshReasonSchema } from "@/lib/competitors/schemas/enums";

// The four refresh-lifecycle fields every CompanyProfile carries (this
// milestone's explicit requirement). Kept as its own schema — not
// hand-inlined into company.schema.ts — so the refresh engine can import
// exactly this shape without importing the entire (much larger) profile.
export const RefreshMetadataSchema = z.object({
  lastUpdated: z.string(),
  nextRefresh: z.string(),
  refreshReason: RefreshReasonSchema,
  refreshPriority: RefreshPrioritySchema,
});

export type RefreshMetadata = z.infer<typeof RefreshMetadataSchema>;
