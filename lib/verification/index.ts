// Public entry point for the Verification layer (Milestone 13). Every
// future consumer (a dashboard, a future report builder in
// lib/decision/) should import from here, never from a deep path into a
// specific file — the same discipline every prior platform's public
// barrel enforces for itself.
export { buildVerificationSummary } from "@/lib/verification/buildVerificationSummary";
export { buildVerificationSummaryFromSession } from "@/lib/verification/buildVerificationSummaryFromSession";

export * from "@/lib/verification/schemas";
