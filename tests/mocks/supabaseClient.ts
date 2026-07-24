import { vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface MockSupabaseError {
  code?: string;
  message: string;
}

export interface MockSupabaseResult<T> {
  data: T | null;
  error: MockSupabaseError | null;
}

export interface MockSupabaseClientOptions {
  /** What `auth.getUser()` resolves to — absent/null means "signed out". */
  user?: User | null;
  /** What the terminal `.order()`/`.maybeSingle()` call resolves to. */
  selectResult?: MockSupabaseResult<unknown>;
  /** What the terminal `.insert()` call resolves to. */
  insertResult?: { error: MockSupabaseError | null };
  /** What the terminal `.gte()` call resolves to (countProjectsThisMonth's count-mode select). */
  countResult?: { count: number | null; error: MockSupabaseError | null };
  /** What `.rpc()` resolves to (Milestone 47 — lib/services/rateLimit's own Postgres functions). */
  rpcResult?: MockSupabaseResult<unknown>;
  /** What the terminal `.upsert()` call resolves to (Milestone 105 — lib/persistence's own generic adapter). */
  upsertResult?: { error: MockSupabaseError | null };
  /** What the terminal `.delete().eq()` call resolves to (Milestone 105). */
  deleteResult?: { error: MockSupabaseError | null };
  /**
   * What the terminal `.update().eq().eq().select()` call resolves to
   * (Milestone 107 — the version-conditional write
   * lib/pipeline/storage/supabaseStore.ts's optimistic-concurrency
   * mechanism depends on). Defaults to a non-empty row (a matched,
   * successful update) — the harmless default every other operation
   * here already uses — so a caller exercising a real, multi-write
   * pipeline run against this generic mock (e.g. a test whose actual
   * subject is business logic, not persistence conflict handling) isn't
   * surprised by an every-write "conflict." Set `{ data: [], error:
   * null }` explicitly to simulate a lost version race instead.
   */
  updateResult?: MockSupabaseResult<unknown[]>;
}

// A small, hand-rolled mock implementing only the exact Supabase
// client call chains this codebase actually uses — precisely, not
// approximately (MILESTONE_30_DESIGN.md Deliverable 5):
//   auth.getUser()
//   from().select().eq().order()                    (listProjects, one filter)
//   from().select().eq().eq().maybeSingle()          (getProjectById, two chained filters)
//   from().insert()                                  (persistProjectFromSession)
//   rpc()                                             (lib/services/rateLimit's own increment/cleanup functions, Milestone 47)
//
// Every method is a vi.fn() spy, so a test can assert exactly which
// arguments a service called it with (e.g. that `.eq` was called with
// `("owner_id", userId)`) — this mock does not itself re-implement
// Postgres filtering semantics, which would be a second, competing
// reimplementation of behavior RLS and the real query already own.
//
// Cast to SupabaseClient at the return boundary: this mock's own
// object literal only ever needs to satisfy the slice of the real
// client's surface this codebase actually calls, not the entire
// SupabaseClient interface — building a fully-typed literal for a
// surface this codebase doesn't use would be exactly the premature
// abstraction this design deliberately avoids.
export function createMockSupabaseClient(options: MockSupabaseClientOptions = {}): SupabaseClient {
  const selectResult = options.selectResult ?? { data: null, error: null };
  const insertResult = options.insertResult ?? { error: null };
  const countResult = options.countResult ?? { count: 0, error: null };
  const rpcResult = options.rpcResult ?? { data: null, error: null };
  const upsertResult = options.upsertResult ?? { error: null };
  const deleteResult = options.deleteResult ?? { error: null };
  const updateResult = options.updateResult ?? { data: [{}], error: null };

  const eq = vi.fn(() => queryBuilder);
  const order = vi.fn(() => Promise.resolve(selectResult));
  const maybeSingle = vi.fn(() => Promise.resolve(selectResult));
  const gte = vi.fn(() => Promise.resolve(countResult));

  const queryBuilder = { eq, order, maybeSingle, gte };

  const select = vi.fn(() => queryBuilder);
  const insert = vi.fn(() => Promise.resolve(insertResult));
  const upsert = vi.fn(() => Promise.resolve(upsertResult));
  // A separate, minimal builder from queryBuilder above: this codebase's
  // only delete call shape is `.delete().eq(...)` awaited directly, with
  // no further chaining (unlike a select chain, which may continue to
  // .maybeSingle()/.order()) — so it doesn't need to share queryBuilder's
  // richer shape.
  const deleteEq = vi.fn(() => Promise.resolve(deleteResult));
  const del = vi.fn(() => ({ eq: deleteEq }));

  // `.update(row).eq(...).eq(...).select()` — any number of chained
  // `.eq()` calls, terminated by `.select()` resolving to `updateResult`.
  // A real UPDATE with a WHERE clause matching zero rows still returns
  // {data: [], error: null} in PostgREST, not an error — the version
  // conflict this simulates is a routine outcome, not a failure.
  const updateSelect = vi.fn(() => Promise.resolve(updateResult));
  const updateBuilder = { eq: vi.fn(() => updateBuilder), select: updateSelect };
  const update = vi.fn(() => updateBuilder);

  const from = vi.fn(() => ({ select, insert, upsert, update, delete: del }));

  const getUser = vi.fn(() => Promise.resolve({ data: { user: options.user ?? null } }));
  const rpc = vi.fn(() => Promise.resolve(rpcResult));

  const client = {
    auth: { getUser },
    from,
    rpc,
  };

  return client as unknown as SupabaseClient;
}
