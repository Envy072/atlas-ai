import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors tsconfig.json's own `"@/*": ["./*"]` path alias exactly — a
// single, static, unlikely-to-change mapping, so it's declared here
// directly rather than adding a plugin dependency (e.g.
// vite-tsconfig-paths) just to keep it in sync automatically
// (MILESTONE_30_DESIGN.md Deliverable 1). Revisit only if
// tsconfig.json ever grows a second, non-trivial alias.
const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    // Vitest's own default is already `!process.env.CI`; set
    // explicitly so the guarantee that a committed test.only/it.only/
    // describe.only fails CI (rather than silently skipping the rest
    // of the suite while still exiting 0) is visible in this file,
    // not an implicit default a future reader has to look up
    // (MILESTONE_30_DESIGN.md Deliverable 1).
    allowOnly: !process.env.CI,
    coverage: {
      provider: "v8",
    },
    // Vitest's default (5000ms) is too tight for
    // tests/integration/analysis-sessions.test.ts: it runs the real,
    // unmodified six-stage pipeline (lib/pipeline through lib/decision)
    // synchronously, and v8 coverage instrumentation across that much
    // code measurably slows it down — ~500ms uninstrumented, but up to
    // ~14s when the full suite runs under `--coverage` (measured
    // directly, Sub-milestone 30.7). A generous, fixed ceiling avoids
    // CI flakiness from a borderline default rather than a slow test —
    // it costs nothing for every other, much faster test in this suite.
    testTimeout: 30_000,
  },
});
