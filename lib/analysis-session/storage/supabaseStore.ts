import { SessionRecordSchema, type SessionRecord } from "@/lib/analysis-session/schemas/session.schema";
import type { AnalysisSessionStore } from "@/lib/analysis-session/types/storage";
import type { StorageAdapter } from "@/lib/persistence/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAdapter } from "@/lib/persistence/adapters/supabaseAdapter";
import { createRepository } from "@/lib/persistence/createRepository";

interface AnalysisSessionRow {
  id: string;
  execution_id: string;
  title: string;
  startup_idea: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

function toRow(record: SessionRecord): AnalysisSessionRow {
  return {
    id: record.id,
    execution_id: record.executionId,
    title: record.title,
    startup_idea: record.startupIdea,
    owner_id: record.ownerId,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function fromRow(row: Record<string, unknown>): SessionRecord {
  const r = row as unknown as AnalysisSessionRow;
  return {
    id: r.id,
    executionId: r.execution_id,
    title: r.title,
    startupIdea: r.startup_idea,
    ownerId: r.owner_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Real as of Milestone 106 (Milestone 104A ADR Decision 4) — built
// entirely on Milestone 105's storage-agnostic persistence core, never
// touching @supabase/supabase-js directly itself. Uses the service-role
// admin client deliberately, not the cookie-aware one: see
// lib/supabase/admin.ts's own comment for why RLS is bypassed here by
// design rather than by oversight. Every field is a plain, typed column
// — SessionRecordSchema has no nested shape needing a jsonb payload,
// unlike pipeline_executions' own richer context (a separate, later
// milestone).
//
// The admin client is constructed lazily, on first real call — not
// eagerly here in the factory body. defaultStore.ts calls this factory
// at module scope (Milestone 106), and every lib/services/stripe.ts call
// site already constructs createAdminClient() lazily, inside a function
// body, for the same underlying reason: nothing should have to touch
// real env vars/a real client just by being imported, only by actually
// being used.
export function createSupabaseAnalysisSessionStore(tableName = "analysis_sessions"): AnalysisSessionStore {
  let cachedAdapter: StorageAdapter<SessionRecord> | null = null;

  function getAdapter(): StorageAdapter<SessionRecord> {
    if (!cachedAdapter) {
      cachedAdapter = createSupabaseAdapter<SessionRecord>({
        client: createAdminClient(),
        tableName,
        toRow: toRow as unknown as (record: SessionRecord) => Record<string, unknown>,
        fromRow,
      });
    }
    return cachedAdapter;
  }

  return createRepository({
    adapter: {
      getById: (id) => getAdapter().getById(id),
      list: () => getAdapter().list(),
      upsert: (record) => getAdapter().upsert(record),
      delete: (id) => getAdapter().delete(id),
    },
    schema: SessionRecordSchema,
    resourceName: "analysis session",
  });
}
