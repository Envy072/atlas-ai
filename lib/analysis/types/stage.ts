// Every pipeline stage module follows this shape: a plain async function
// named `analyze`, taking a stage-specific input and returning a
// stage-specific output. This alias exists purely to document and check
// that convention — stage modules export a real function, not an object
// implementing this type.
export type AnalysisStageFn<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
