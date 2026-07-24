import type { ZodType } from "zod";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/validation/parse";
import type { StorageAdapter } from "@/lib/persistence/types";

export interface CreateRepositoryOptions<T> {
  adapter: StorageAdapter<T>;
  schema: ZodType<T>;
  // Named for error messages only ("analysis session", "pipeline
  // execution") — never used to pick behavior, so every repository this
  // factory builds is handled identically regardless of what it stores.
  resourceName: string;
}

// The one place "wrap a storage adapter with validation and consistent
// error handling" happens (Milestone 105) — every current store
// (in-memory or the real Supabase adapters this unblocks) gets this for
// free by being built through this factory, rather than each
// implementing its own validation/error-mapping ad hoc. Storage-agnostic
// by construction: this file has no import of any specific backend, only
// the adapter contract every backend already satisfies.
//
// Validates on write (before the adapter ever sees a record — an invalid
// record never reaches storage) and on read (after the adapter returns
// one — defense in depth against a row a different, older code path
// wrote, matching lib/pipeline/checkpoint/checkpointWriter.ts's own
// existing parseOrThrow-before-persist precedent, now applied
// symmetrically on the read side too, which no existing store does
// today since an in-memory Map trivially round-trips whatever it was
// given).
export function createRepository<T>({ adapter, schema, resourceName }: CreateRepositoryOptions<T>): StorageAdapter<T> {
  async function run<R>(action: () => Promise<R>): Promise<R> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ExternalServiceError("Supabase", `${resourceName} storage operation failed.`);
    }
  }

  return {
    async getById(id) {
      const record = await run(() => adapter.getById(id));
      if (!record) return null;
      return parseOrThrow(schema, record, `Stored ${resourceName} did not match the expected shape.`);
    },

    async list() {
      const records = await run(() => adapter.list());
      return records.map((record) =>
        parseOrThrow(schema, record, `Stored ${resourceName} did not match the expected shape.`)
      );
    },

    async upsert(record) {
      const validated = parseOrThrow(schema, record, `Invalid ${resourceName} — refusing to persist.`);
      await run(() => adapter.upsert(validated));
    },

    async delete(id) {
      await run(() => adapter.delete(id));
    },
  };
}
