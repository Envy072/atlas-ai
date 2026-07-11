// Not a Zod-validated data shape — never crosses a schema boundary, only
// tunes how matchCompanyName (matcher/entityMatcher.ts) behaves for a
// given caller. Its *output* (CompanyMatchResult) is schema-validated;
// this input configuration isn't.
export interface EntityMatchOptions {
  /** Minimum token-overlap score (0-100) to consider two names a match. */
  matchThreshold?: number;
}
