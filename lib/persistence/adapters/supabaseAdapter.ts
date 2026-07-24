import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter } from "@/lib/persistence/types";

export interface CreateSupabaseAdapterOptions<T> {
  // Injected, never constructed here — which client (cookie-aware,
  // service-role, or otherwise) is the right one for a given table is a
  // caller decision (Milestone 106 makes it for analysis_sessions/
  // pipeline_executions specifically), not something this generic
  // adapter should decide or hide.
  client: SupabaseClient;
  tableName: string;
  // A stored row's shape is this table's own concern (typed columns for
  // whatever it queries on, a jsonb payload for the rest) — never a
  // shape this generic adapter assumes. toRow/fromRow are where that
  // per-table mapping lives; this file only ever moves whatever they
  // produce in and out of Supabase.
  toRow: (record: T) => Record<string, unknown>;
  fromRow: (row: Record<string, unknown>) => T;
}

// The first concrete StorageAdapter implementation (Milestone 105) —
// Supabase is one pluggable backend among possible future others (an
// in-memory adapter already exists in spirit as every current
// MemoryXStore class; nothing about this file is special-cased into
// createRepository.ts, which only ever depends on the StorageAdapter
// contract). No migration is created or assumed by this file — it's
// exercised entirely against an injected client in this milestone's own
// tests; a real table only needs to exist once a caller actually uses it
// (Milestone 106).
export function createSupabaseAdapter<T>({
  client,
  tableName,
  toRow,
  fromRow,
}: CreateSupabaseAdapterOptions<T>): StorageAdapter<T> {
  return {
    async getById(id) {
      const { data, error } = await client.from(tableName).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? fromRow(data as Record<string, unknown>) : null;
    },

    async list() {
      const { data, error } = await client.from(tableName).select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data as Record<string, unknown>[] | null) ?? []).map(fromRow);
    },

    async upsert(record) {
      const { error } = await client.from(tableName).upsert(toRow(record));
      if (error) throw new Error(error.message);
    },

    async delete(id) {
      const { error } = await client.from(tableName).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
